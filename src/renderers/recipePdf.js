import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  const [serif, body, bold] = await Promise.all([
    StandardFonts.TimesRomanBold, StandardFonts.Helvetica, StandardFonts.HelveticaBold
  ].map(name => pdf.embedFont(name)));
  const ink = rgb(.10,.10,.10), muted = rgb(.30,.30,.30);
  const rule = rgb(.82,.82,.82);
  const left = 36, right = 580, bottom = 33;
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
        const face = (font === body ? '' : 'bold ') + (size * 3) + 'px ' + (font === serif ? 'serif' : 'sans-serif');
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
    const timeColor = ink;
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
      add(m[0], ranges.some(([start,end]) => start < m.index+m[0].length && end > m.index));
    }
    flush(); return lines;
  }
  async function draw(line, x, pos, font, size, color) {
    for (const { word, m, offset, font: face, color: tint } of line) {
      if (m.image) page.drawImage(await m.image, { x:x+offset, y:pos+size-m.height, width:m.width, height:m.height });
      else page.drawText(word,{ x:x+offset,y:pos,font:face,size,color:tint || color });
    }
  }
  function newPage() {
    page = pdf.addPage([612,792]); y = 744;

  }
  function room(height) { if (y - height < bottom) newPage(); }
  async function paragraph(text,font,size,leading,color=ink,x=left,width=right-x) {
    const lines = wrap(text,font,size,width);
    if (lines.length <= 12) room(lines.length * leading);
    for (const line of lines) { room(leading); await draw(line,x,y,font,size,color); y -= leading; }
  }
  newPage();
  let titleSize = 22;
  while (titleSize > 18 && wrap(title,serif,titleSize,right-left).length > 1) titleSize--;
  await paragraph(title,serif,titleSize,titleSize + 1);
  const servings = model.state?.displayServings ?? recipe.servings;
  const yieldText = (model.state?.scale ?? 1) === 1 && meta.get('yield');
  const details = [
    servings && !/servings?/i.test(yieldText || '') && 'Serves ' + servings,
    yieldText, meta.get('total_time') || meta.get('time')
  ].filter(v => typeof v === 'string' && v.trim());
  if (details.length) await paragraph(details.join('  ·  '),bold,9.5,13,muted);
  if (recipe.description) await paragraph(recipe.description,body,10,13);
  y -= 3;
  const methodLeft = 222, numberWidth = 17, leading = 12.6;
  for (const section of recipeSections(recipe,model.settings?.showQuantitiesInline)) {
    if (!section.ingredients.length && section.entries.every(entry => 'note' in entry)) {
      if (section.name) await paragraph(section.name,serif,14,18);
      for (const entry of section.entries) await paragraph(entry.note,body,9.5,12.5,muted);
      y -= 3;
      continue;
    }
    // Flow each column independently, then start the next section below both.
    const ingredients = section.ingredients.map(text => ({
      lines: wrap(text,body,9.6,methodLeft-left-18), font:body, size:9.6, after:1.7
    }));
    const method = section.entries.map(entry => ({
      lines:wrap(entry.note ?? entry.text,body,10,right-methodLeft-numberWidth,entry.timers),
      font:body, size:10, after:4, number:'note' in entry ? null : ++step
    }));
    room(72);
    y -= 3;
    page.drawLine({start:{x:left,y},end:{x:right,y},thickness:.5,color:rule});
    y -= 15;
    if (section.name) await paragraph(section.name,serif,14,18);
    function columnLabels() {
      page.drawText('INGREDIENTS',{x:left,y,font:bold,size:8,color:muted});
      page.drawText('METHOD',{x:methodLeft,y,font:bold,size:8,color:muted});
      y -= 13;
    }
    columnLabels();
    async function column(blocks,x,numbered) {
      let pos=y;
      const lineHeight = numbered ? leading : 11.3;
      while (blocks.length) {
        const block=blocks[0];
        const available=Math.floor((pos-bottom)/lineHeight);
        if (available<=0 || (block.lines.length>available && available<3)) break;
        if (numbered && block.number) {
          page.drawText(String(block.number)+'.',{x,y:pos,font:bold,size:9,color:ink});
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
        if (section.name) await paragraph(section.name+' (continued)',serif,14,18);
        columnLabels();
      }
    }
  }
  const pages=pdf.getPages();
  pages.forEach((p,i)=>{
    if (pages.length === 1) return;
    const label=(i+1)+' / '+pages.length;
    p.drawText(label,{x:right-body.widthOfTextAtSize(label,9),y:24,font:body,size:9,color:muted});
  });
  return pdf.save();
}

