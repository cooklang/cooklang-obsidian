import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage, type RGB } from 'pdf-lib';
import { recipeSections, recipePdfDetails, type TextRange } from '../utils/recipePdfModel';
import { canvasTextLineRanges, textDirection } from '../utils/pdfTextLayout';
import type { RecipeRenderModel } from '../ui/types';

type PdfModel = Pick<RecipeRenderModel, 'recipe' | 'file'> & {
  state?: Pick<RecipeRenderModel['state'], 'scale' | 'displayServings'>;
  settings?: Pick<RecipeRenderModel['settings'], 'showQuantitiesInline'>;
};
type WordMetrics = { width: number; image?: Promise<PDFImage>; height?: number };
type Line = { word: string; m: WordMetrics; offset: number; font: PDFFont; color: RGB | null }[];
type NoteBlock = { isNote: true; lines: Line[]; after: number };
type TextBlock = { isNote?: false; lines: Line[]; font: PDFFont; size: number; after: number; number?: number | null };
type Block = NoteBlock | TextBlock;

export async function createPdf(model: PdfModel, customFonts?: { regular: Uint8Array; bold?: Uint8Array }) {
  const pdf = await PDFDocument.create();
  const recipe = model.recipe;
  const title = recipe.title || (model.file?.basename ?? 'Recipe').replace(/\.cook$/i, '');
  pdf.setTitle(title);
  pdf.setCreator('Cooklang PDF');
  if (customFonts) {
    const fontkit = await import('@pdf-lib/fontkit');
    pdf.registerFontkit(fontkit.default);
  }
  const body = await pdf.embedFont(customFonts?.regular ?? StandardFonts.Helvetica, { subset: true });
  const bold = await pdf.embedFont(customFonts ? (customFonts.bold ?? customFonts.regular) : StandardFonts.HelveticaBold, { subset: true });
  const localFaces: FontFace[] = [];
  let family = 'sans-serif';
  try {
  // The same optional face is used if canvas shaping is needed for bidi text.
  if (customFonts && typeof FontFace !== 'undefined') {
    family = 'cook-pdf-' + Math.random().toString(36).slice(2);
    for (const [weight, bytes] of [['400', customFonts.regular], ['700', customFonts.bold ?? customFonts.regular]] as const) {
      const face = new FontFace(family, new Uint8Array(bytes).buffer, { weight });
      await face.load(); document.fonts.add(face); localFaces.push(face);
    }
  }
  // Standalone SVG images cannot access the document's FontFace set.
  const fontData = (bytes: Uint8Array) => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  let svgFonts: string | undefined;
  function embeddedSvgFonts() {
    return svgFonts ??= customFonts ? ([['400',customFonts.regular],['700',customFonts.bold ?? customFonts.regular]] as const)
      .map(([weight,bytes]) => `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/ttf;base64,${fontData(bytes)})}`).join('') : '';
  }

  const ink = rgb(.15,.14,.14), muted = rgb(.35,.33,.32);
  const accent = rgb(.31,.40,.48), rule = rgb(.80,.83,.85);
  const left = 43, right = 569, bottom = 49;
  let page!: PDFPage;
  let y = 735, step = 0;
  const glyphs = new Map<string, WordMetrics>();
  const supported = new Map([body, bold].map(font => [font, new Set(font.getCharacterSet())]));

  function canvasContext(font: PDFFont, size: number) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas text rendering is unavailable.');
    ctx.font = (font === body ? '' : 'bold ') + (size * 3) + 'px ' + family;
    return { canvas, ctx };
  }
  function rasterLine(text: string, font: PDFFont, size: number, direction: 'rtl' | 'ltr'): WordMetrics {
    const key = [font.name, size, direction, text].join('|');
    if (!glyphs.has(key)) {
      const { canvas, ctx } = canvasContext(font,size);
      const face = ctx.font;
      const width = Math.ceil(ctx.measureText(text).width) + 6;
      canvas.width = width; canvas.height = Math.ceil(size * 4.5);
      ctx.font = face; ctx.fillStyle = '#262424';
      ctx.direction = direction; ctx.textAlign = direction === 'rtl' ? 'right' : 'left';
      ctx.fillText(text, direction === 'rtl' ? width - 3 : 3, size * 3);
      glyphs.set(key, { width: width / 3, image: pdf.embedPng(canvas.toDataURL()), height: canvas.height / 3 });
    }
    return glyphs.get(key)!;
  }
  function rasterStyledLine(runs: { text: string; tint: RGB | null }[], font: PDFFont, size: number,
    direction: 'rtl' | 'ltr', measuredWidth: number): WordMetrics {
    const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[char]!));
    const width = Math.ceil(measuredWidth * 3) + 6, height = Math.ceil(size * 4.5);
    const color = (tint: RGB) => `rgb(${Math.round(tint.red*255)},${Math.round(tint.green*255)},${Math.round(tint.blue*255)})`;
    const contents = runs.map(run => `<tspan font-weight="${run.tint || font === bold ? 700 : 400}" fill="${color(run.tint || ink)}">${escape(run.text)}</tspan>`).join('');
    // SVG lays out all logical runs together; drawing separate canvas words
    // would lose the bidi ordering and shaping context of the complete line.
    const key = JSON.stringify([runs,font.name,size,direction]);
    if (!glyphs.has(key)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>${embeddedSvgFonts()}</style><text x="${direction === 'rtl' ? width-3 : 3}" y="${size*3}" font-family="${family}" font-size="${size*3}" direction="${direction}" text-anchor="start" xml:space="preserve">${contents}</text></svg>`;
      const image = new Promise<PDFImage>((resolve,reject) => {
        const source = new Image();
        source.onload = () => {
          try {
            const { canvas,ctx } = canvasContext(font,size);
            canvas.width = width; canvas.height = height;
            ctx.drawImage(source,0,0);
            resolve(pdf.embedPng(canvas.toDataURL()));
          } catch (error) { reject(error); }
        };
        source.onerror = () => reject(new Error('Could not render styled PDF text.'));
        source.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      glyphs.set(key,{ width:width/3,height:height/3,image });
    }
    return glyphs.get(key)!;
  }
  function metrics(word: string, font: PDFFont, size: number): WordMetrics {
    return { width: font.widthOfTextAtSize(word, size) };
  }
  function wrap(text: string, font: PDFFont, size: number, width: number, times?: string[], ingredientRanges: TextRange[] = []): Line[] {
    const ranges: TextRange[] = [];
    const ingredientInk = rgb(.29,.23,.20);
    const source = String(text);
    if (times) {
      // Preserve semantic timers and also highlight written ranges such as
      // "1 minute to 2 minutes" where only one endpoint was a Cooklang timer.
      const duration = /\b(?:\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?(?:\s*[-–—]\s*\d+(?:[./]\d+)?)?\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b)/gi;
      for (const m of source.matchAll(duration)) ranges.push([m.index,m.index+m[0].length]);
      // Join written endpoints before adding semantic timers so the whole
      // phrase, including "to", is both protected and emphasized.
      for (let i = 0; i + 1 < ranges.length;) {
        if (/^\s+(?:to|[-–—])\s+$/i.test(source.slice(ranges[i][1], ranges[i + 1][0]))) {
          ranges[i][1] = ranges[i + 1][1]; ranges.splice(i + 1, 1);
        } else i++;
      }
      for (const time of times) {
        for (let i=source.indexOf(time); i>=0; i=source.indexOf(time,i+time.length))
          ranges.push([i,i+time.length]);
      }
    }
    const tintAt = (start: number, end: number) => {
      const overlaps = ([a,b]: TextRange) => a < end && b > start;
      return ranges.some(overlaps) ? accent : ingredientRanges.some(overlaps) ? ingredientInk : null;
    };
    // Coverage belongs to the face that will actually draw each word.
    const needsCanvas = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(text) ||
      Array.from(source.matchAll(/\S+/gu)).some(m => {
        const face = tintAt(m.index,m.index+m[0].length) ? bold : font;
        return Array.from(m[0]).some(char => !supported.get(face)!.has(char.codePointAt(0)!));
      });
    if (needsCanvas) {
      const direction = textDirection(text);
      const { ctx } = canvasContext(font,size);
      const normalFace = ctx.font;
      const boldFace = canvasContext(bold,size).ctx.font;
      function runs(start: number, end: number) {
        const boundaries = new Set([start,end]);
        for (const [a,b] of [...ranges,...ingredientRanges]) {
          if (a > start && a < end) boundaries.add(a);
          if (b > start && b < end) boundaries.add(b);
        }
        const points = [...boundaries].sort((a,b) => a-b);
        return points.slice(0,-1).map((a,i) => ({ text:source.slice(a,points[i+1]), tint:tintAt(a,points[i+1]) }));
      }
      function measure(start: number, end: number) {
        ctx.font = normalFace;
        let width = ctx.measureText(source.slice(start,end)).width;
        for (const run of runs(start,end)) if (run.tint) {
          ctx.font = normalFace; width -= ctx.measureText(run.text).width;
          ctx.font = boldFace; width += ctx.measureText(run.text).width;
        }
        return width / 3;
      }
      return canvasTextLineRanges(text,width-2,measure,ranges).map(([start,end]) => {
        const word = source.slice(start,end);
        const styled = runs(start,end);
        const m = styled.some(run => run.tint)
          ? rasterStyledLine(styled,font,size,direction,measure(start,end))
          : rasterLine(word,font,size,direction);
        return [{ word,m,offset:direction === 'rtl' ? Math.max(0,width-m.width) : 0,font,color:null }];
      });
    }
    const lines: Line[] = [];
    let line: Line = [], used = 0;
    const gap = font.widthOfTextAtSize(' ', size);
    function flush() { if (line.length) lines.push(line); line = []; used = 0; }
    function add(word: string, tint: RGB | null): void {
      const face = tint ? bold : font;
      const m = metrics(word,face,size);
      if (line.length && used + gap + m.width > width) flush();
      if (m.width > width && Array.from(word).length > 1) {
        let piece = '';
        for (const char of word) {
          if (piece && metrics(piece + char,face,size).width > width) { add(piece,tint); flush(); piece = ''; }
          piece += char;
        }
        add(piece,tint); return;
      }
      if (line.length) used += gap;
      line.push({ word, m, offset: used, font: face, color: tint }); used += m.width;
    }
    for (const m of source.matchAll(/\S+/gu)) {
      const phrase = ranges.find(([start]) => start === m.index);
      if (line.length && phrase) {
        const widthNeeded = metrics(source.slice(phrase[0],phrase[1]),bold,size).width;
        if (widthNeeded <= width && used + gap + widthNeeded > width) flush();
      }
      const overlaps = ([start,end]: TextRange) => start < m.index+m[0].length && end > m.index;
      const tint = ranges.some(overlaps) ? accent : ingredientRanges.some(overlaps) ? ingredientInk : null;
      add(m[0], tint);
    }
    flush(); return lines;
  }
  async function draw(line: Line, x: number, pos: number, font: PDFFont, size: number, color: RGB) {
    for (const { word, m, offset, font: face, color: tint } of line) {
      if (m.image) page.drawImage(await m.image, { x:x+offset, y:pos+size-m.height!, width:m.width, height:m.height! });
      else page.drawText(word, { x:x+offset, y:pos, size, font:face, color:tint || color });
    }
  }
  async function newPage() {
    page = pdf.addPage([612,792]); y = 735;
    if (pdf.getPageCount() > 1) {
      const header = wrap(title,body,9,right-left);
      for (const line of header) {
        await draw(line,left,y,body,9,muted);
        y -= 12;
      }
      y -= 1;
    }
  }
  async function room(height: number) { if (y - height < bottom) await newPage(); }
  async function paragraph(text: string,font: PDFFont,size: number,leading: number,color=ink,x=left,width=right-x) {
    const lines = wrap(text,font,size,width);
    if (lines.length <= 12) await room(lines.length * leading);
    for (const line of lines) { await room(leading); await draw(line,x,y,font,size,color); y -= leading; }
  }
  const noteLeading = 13, notePadding = 8;
  function noteBlock(text: string, width: number): NoteBlock {
    return { isNote:true, lines:text.split(/\r?\n/).flatMap(line => line.trim() ? wrap(line,body,10,width-2*notePadding) : [[]]), after:7 };
  }
  async function noteChunk(block: NoteBlock, x: number, top: number, width: number) {
    const capacity = Math.floor((top-bottom-2*notePadding)/noteLeading);
    if (capacity < 1) return null;
    const lines = block.lines.splice(0,capacity);
    const height = 2*notePadding + lines.length*noteLeading;
    page.drawRectangle({x,y:top-height,width,height,color:rgb(.95,.965,.975)});
    page.drawRectangle({x,y:top-height,width:1.7,height,color:accent});
    let baseline = top-notePadding-9;
    for (const line of lines) {
      await draw(line,x+notePadding+1,baseline,body,10,ink);
      baseline-=noteLeading;
    }
    return top-height-block.after;
  }
  async function openingNote(entry: { note: string }) {
    const block = noteBlock(entry.note,right-left);
    while (block.lines.length) {
      await room(2*notePadding+noteLeading*Math.min(3,block.lines.length)+1);
      y = (await noteChunk(block,left,y,right-left))!;
      if (block.lines.length) await newPage();
    }
  }
  await newPage();
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
  const details = recipePdfDetails(recipe, model.state);
  if (details.length) await paragraph(details.join('   ·   '),bold,10,17,accent);
  if (recipe.description) await paragraph(recipe.description,body,10,13);
  y -= 3;
  const methodLeft = 230, numberWidth = 20, leading = 15.5;
  for (const section of recipeSections(recipe,model.settings?.showQuantitiesInline)) {
    const firstStep = section.entries.findIndex(entry => 'text' in entry);
    const first = firstStep < 0 ? section.entries.length : firstStep;
    const opening = section.entries.slice(0,first).filter((entry): entry is { note: string } => 'note' in entry);
    if (firstStep < 0 && !section.ingredients.length) {
      if (section.name) await paragraph(section.name,bold,15,21);
      for (const entry of opening) await openingNote(entry);
      continue;
    }
    if (!section.name) for (const entry of opening) await openingNote(entry);
    // Flow each column independently, then start the next section below both.
    const ingredients: Block[] = section.ingredients.map(text => ({
      lines: wrap(text,body,10.7,methodLeft-left-21), font:body, size:10.7, after:3
    }));
    const method: Block[] = section.entries.slice(first).map(entry => 'note' in entry
      ? noteBlock(entry.note,right-methodLeft-numberWidth) : ({
      lines:wrap(entry.text,body,11.1,right-methodLeft-numberWidth,entry.timers,entry.ingredientRanges),
      font:body, size:11.1, after:6, number:++step
    }));
    const height = (blocks: Block[], advance: number) => blocks.reduce((sum,b) => sum + (b.isNote ? 2*notePadding+b.lines.length*noteLeading : b.lines.length*advance)+b.after,0);
    const sectionHeight = Math.max(height(ingredients,14),height(method,leading)) + 56;
    // Move an intact section to a fresh page when it can fit there.
    if (sectionHeight < 680 && sectionHeight > y-bottom ) await newPage();
    await room(84);
    y -= 3;
    page.drawLine({start:{x:left,y},end:{x:right,y},thickness:.5,color:rule});
    y -= 20;
    if (section.name) await paragraph(section.name,bold,15,21);
    if (section.name) for (const entry of opening) await openingNote(entry);
    await room(46);
    function columnLabels() {
      page.drawText('Ingredients', { x:left, y, size:9.5, font:bold, color:accent });
      page.drawText('Method', { x:methodLeft, y, size:9.5, font:bold, color:accent });
      y -= 17;
    }
    columnLabels();
    async function column(blocks: Block[],x: number,numbered: boolean) {
      let pos=y;
      const lineHeight = numbered ? leading : 14;
      while (blocks.length) {
        const block=blocks[0];
        if (block.isNote) {
          const end = await noteChunk(block,x+numberWidth,pos+5,right-x-numberWidth);
          if (end === null) break;
          pos=end-8;
          if (block.lines.length) break;
          blocks.shift();
          continue;
        }
        const available=Math.floor((pos-bottom)/lineHeight);
        if (available<=0 || (block.lines.length>available && available<3)) break;
        if (numbered && block.number) {
          page.drawText(String(block.number)+'.', { x, y:pos, size:9.5, font:bold, color:accent });
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
        await newPage();
        if (section.name) await paragraph(section.name+' (continued)',bold,14,20);
        columnLabels();
      }
    }
  }
  const pages=pdf.getPages();
  pages.forEach((p,i)=>{
    if (pages.length === 1) return;
    const label=(i+1)+' / '+pages.length;
    p.drawText(label, { x:right-body.widthOfTextAtSize(label,9), y:26, size:9, font:body, color:muted });
  });
  return await pdf.save();
  } finally {
    for (const face of localFaces) document.fonts.delete(face);
  }
}

