import { PDFDocument, rgb } from 'pdf-lib';
import { embedGeist } from './geist';

function numeric(n) {
  if (n.type === 'regular') return String(n.value);
  const { whole, num, den } = n.value;
  return [whole || '', num ? num + '/' + den : ''].filter(Boolean).join(' ') || '0';
}

function amount(q) {
  if (!q) return '';
  const v = q.value;
  let value;
  if (v.type === 'number') value = numeric(v.value);
  else if (v.type === 'range') value = numeric(v.value.start) + '–' + numeric(v.value.end);
  else value = String(v.value);
  return [value, q.unit].filter(Boolean).join(' ');
}

export function recipeSections(recipe, modelInlineQuantities = false) {
  const label = item => item.alias || item.name;
  return recipe.sections.map(section => {
    const ingredients = [];
    const seen = new Set();
    const entries = section.content.map(entry => {
      if (entry.type === 'text') return { note: entry.value };
      const timers = [];
      const text = entry.value.items.map(part => {
        switch (part.type) {
          case 'text': return part.value;
          case 'inlineQuantity': return amount(recipe.inlineQuantities[part.index]);
          case 'cookware': return label(recipe.cookware[part.index]);
          case 'timer': {
            const timer = recipe.timers[part.index];
            const duration = amount(timer.quantity);
            if (duration) timers.push(duration);
            return [duration, timer.name].filter(Boolean).join(' ');
          }
          case 'ingredient': {
            const ing = recipe.ingredients[part.index];
            if (!seen.has(part.index)) {
              seen.add(part.index);
              if (recipe.groupedIngredients.some(([listed]) => listed === ing)) {
                ingredients.push([amount(ing.quantity), label(ing), ing.note && '(' + ing.note + ')'].filter(Boolean).join(' '));
              }
            }
            return modelInlineQuantities && ing.quantity ? label(ing) + ' (' + amount(ing.quantity) + ')' : label(ing);
          }
          default: throw new Error('Unsupported Cooklang step item: ' + part.type);
        }
      }).join('');
      return { text, timers };
    });
    return { name: section.name, ingredients, entries };
  });
}

export async function createPdf(model) {
  const pdf = await PDFDocument.create();
  const recipe = model.recipe;
  const meta = recipe.rawMetadata;
  const title = recipe.title || model.file.basename.replace(/\.cook$/i, '');
  pdf.setTitle(title);
  pdf.setCreator('Cooklang PDF');
  const body = embedGeist(pdf, 'Regular');
  const bold = embedGeist(pdf, 'SemiBold');
  const ink = rgb(.15,.14,.14), muted = rgb(.35,.33,.32);
  const accent = rgb(.52,.22,.16), rule = rgb(.85,.81,.78);
  const left = 43, right = 569, bottom = 49;
  let page, y, step = 0;
  const glyphs = new Map();

  // Standard PDF fonts keep Latin text selectable. Use the platform's font
  // fallback for characters outside WinAnsi, including CJK ingredient names.
  function metrics(word, font, size) {
    try { return { width: font.widthOfTextAtSize(word, size) }; }
    catch {
      const key = [font.name, size, word].join('|');
      if (!glyphs.has(key)) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const face = (font === body ? '' : 'bold ') + (size * 3) + 'px ' + 'sans-serif';
        ctx.font = face;
        const width = Math.ceil(ctx.measureText(word).width) + 2;
        canvas.width = width; canvas.height = Math.ceil(size * 4.5);
        ctx.font = face; ctx.fillStyle = '#191919';
        ctx.fillText(word, 0, size * 3);
        glyphs.set(key, { width: width / 3, image: pdf.embedPng(canvas.toDataURL()), height: canvas.height / 3 });
      }
      return glyphs.get(key);
    }
  }
  function wrap(text, font, size, width, times) {
    const ranges = [];
    const timeColor = accent;
    const source = String(text);
    if (times) {
      // Preserve semantic timers and also highlight written ranges such as
      // "1 minute to 2 minutes" where only one endpoint was a Cooklang timer.
      const duration = /\b(?:\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?(?:\s*[-–—]\s*\d+(?:[./]\d+)?)?\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b)/gi;
      for (const m of source.matchAll(duration)) ranges.push([m.index,m.index+m[0].length]);
      for (const time of times) {
        for (let i=source.indexOf(time); i>=0; i=source.indexOf(time,i+time.length))
          ranges.push([i,i+time.length]);
      }
    }
    const lines = [];
    let line = [], used = 0;
    const gap = font.widthOfTextAtSize(' ', size);
    function flush() { if (line.length) lines.push(line); line = []; used = 0; }
    function add(word, highlight) {
      const face = highlight ? bold : font;
      const m = metrics(word,face,size);
      if (line.length && used + gap + m.width > width) flush();
      if (m.width > width && Array.from(word).length > 1) {
        let piece = '';
        for (const char of word) {
          if (piece && metrics(piece + char,face,size).width > width) { add(piece,highlight); flush(); piece = ''; }
          piece += char;
        }
        add(piece,highlight); return;
      }
      if (line.length) used += gap;
      line.push({ word, m, offset: used, font: face, color: highlight ? timeColor : null }); used += m.width;
    }
    for (const m of source.matchAll(/\S+/gu)) {
      const phrase = ranges.find(([start]) => start === m.index);
      if (line.length && phrase) {
        const widthNeeded = metrics(source.slice(phrase[0],phrase[1]),bold,size).width;
        if (widthNeeded <= width && used + gap + widthNeeded > width) flush();
      }
      add(m[0], ranges.some(([start,end]) => start < m.index+m[0].length && end > m.index));
    }
    flush(); return lines;
  }
  async function draw(line, x, pos, font, size, color) {
    for (const { word, m, offset, font: face, color: tint } of line) {
      if (m.image) page.drawImage(await m.image, { x:x+offset, y:pos+size-m.height, width:m.width, height:m.height });
      else face.draw(page,word,x+offset,pos,size,tint || color);
    }
  }
  function newPage() {
    page = pdf.addPage([612,792]); y = 735;
    if (pdf.getPageCount() > 1) {
      const header = wrap(title,body,9,right-left);
      for (const line of header) {
        for (const item of line) {
          if (!item.m.image) body.draw(page,item.word,left+item.offset,y,9,muted);
        }
        y -= 12;
      }
      y -= 1;
    }
  }
  function room(height) { if (y - height < bottom) newPage(); }
  async function paragraph(text,font,size,leading,color=ink,x=left,width=right-x) {
    const lines = wrap(text,font,size,width);
    if (lines.length <= 12) room(lines.length * leading);
    for (const line of lines) { room(leading); await draw(line,x,y,font,size,color); y -= leading; }
  }
  newPage();
  // Balance multi-line titles at a fixed reading size, keeping short titles on one line.
  const titleSize = 23, maxWidth = right-left;
  const lineCount = wrap(title,bold,titleSize,maxWidth).length;
  let titleWidth = maxWidth;
  if (lineCount > 1) {
    for (let w = maxWidth-6; w >= maxWidth*.65; w -= 6) {
      if (wrap(title,bold,titleSize,w).length > lineCount) break;
      titleWidth=w;
    }
  }
  await paragraph(title,bold,titleSize,26,ink,left,titleWidth);
  y += 4;
  const servings = model.state?.displayServings ?? recipe.servings;
  const yieldText = (model.state?.scale ?? 1) === 1 && meta.get('yield');
  const details = [
    servings && !/servings?/i.test(yieldText || '') && 'Serves ' + servings,
    yieldText, meta.get('total_time') || meta.get('time')
  ].filter(v => typeof v === 'string' && v.trim());
  if (details.length) await paragraph(details.join('   ·   '),bold,10,17,accent);
  if (recipe.description) await paragraph(recipe.description,body,10,13);
  y -= 3;
  const methodLeft = 230, numberWidth = 20, leading = 15.5;
  for (const section of recipeSections(recipe,model.settings?.showQuantitiesInline)) {
    if (!section.ingredients.length && section.entries.every(entry => 'note' in entry)) {
      if (section.name) await paragraph(section.name,bold,15,21);
      for (const entry of section.entries) await paragraph(entry.note,body,10,14,muted);
      y -= 3;
      continue;
    }
    // Flow each column independently, then start the next section below both.
    const ingredients = section.ingredients.map(text => ({
      lines: wrap(text,body,10.7,methodLeft-left-21), font:body, size:10.7, after:3
    }));
    const method = section.entries.map(entry => ({
      lines:wrap(entry.note ?? entry.text,body,11.1,right-methodLeft-numberWidth,entry.timers),
      font:body, size:11.1, after:6, number:'note' in entry ? null : ++step
    }));
    const height = (blocks, advance) => blocks.reduce((sum,b) => sum + b.lines.length*advance+b.after,0);
    const sectionHeight = Math.max(height(ingredients,14),height(method,leading)) + 56;
    // Move an intact section to a fresh page when it can fit there.
    if (sectionHeight < 680 && sectionHeight > y-bottom ) newPage();
    room(84);
    y -= 3;
    page.drawLine({start:{x:left,y},end:{x:right,y},thickness:.5,color:rule});
    y -= 20;
    if (section.name) await paragraph(section.name,bold,15,21);
    function columnLabels() {
      bold.draw(page,'Ingredients',left,y,9.5,accent);
      bold.draw(page,'Method',methodLeft,y,9.5,accent);
      y -= 17;
    }
    columnLabels();
    async function column(blocks,x,numbered) {
      let pos=y;
      const lineHeight = numbered ? leading : 14;
      while (blocks.length) {
        const block=blocks[0];
        const available=Math.floor((pos-bottom)/lineHeight);
        if (available<=0 || (block.lines.length>available && available<3)) break;
        if (numbered && block.number) {
          bold.draw(page,String(block.number)+'.',x,pos,9.5,accent);
          block.number=null;
        }
        for (const line of block.lines.splice(0,available)) {
          await draw(line,x+(numbered?numberWidth:0),pos,block.font,block.size,ink);
          pos-=lineHeight;
        }
        if (block.lines.length) break;
        pos-=block.after;
        blocks.shift();
      }
      return pos;
    }
    while (ingredients.length || method.length) {
      const ingEnd=await column(ingredients,left,false);
      const methodEnd=await column(method,methodLeft,true);
      y=Math.min(ingEnd,methodEnd);
      if (ingredients.length || method.length) {
        newPage();
        if (section.name) await paragraph(section.name+' (continued)',bold,14,20);
        columnLabels();
      }
    }
  }
  const pages=pdf.getPages();
  pages.forEach((p,i)=>{
    if (pages.length === 1) return;
    const label=(i+1)+' / '+pages.length;
    body.draw(p,label,right-body.widthOfTextAtSize(label,9),26,9,muted);
  });
  return pdf.save();
}

