(() => {
  'use strict';
  function init() {
    const root=document.getElementById('knowledge-network');
    if(!root || root.dataset.ready) return;
    const data=JSON.parse(root.querySelector('#kn-data').textContent),select=root.querySelector('select'),search=root.querySelector('input'),svg=root.querySelector('svg'),viewport=root.querySelector('.kn-viewport'),status=root.querySelector('.kn-status'),related=root.querySelector('.kn-related');
    const NS='http://www.w3.org/2000/svg'; let zoom=1;
    function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
    function render(){
      svg.replaceChildren();related.replaceChildren();related.hidden=true;
      const category=select.value,term=search.value.trim().toLocaleLowerCase();
      let nodes=category?data.nodes.filter(n=>n.category===category):data.categories.map((c,i)=>({id:'category-'+i,title:c,category:c,hub:true}));
      if(term)nodes=nodes.filter(n=>n.title.toLocaleLowerCase().includes(term));
      const columns=category?5:3,width=category?1120:900,rows=Math.max(1,Math.ceil(nodes.length/columns)),height=category?rows*116+80:rows*170+100;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.width=width*zoom+'px';svg.style.height=height*zoom+'px';
      const positions=new Map(nodes.map((n,i)=>[n.id,{x:32+(i%columns)*(width-64)/columns,y:50+Math.floor(i/columns)*(category?116:170)}]));
      const defs=el('defs'),marker=el('marker',{id:'kn-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'currentColor'}));defs.append(marker);svg.append(defs);
      const links=category?data.edges.filter(e=>positions.has(e.from)&&positions.has(e.to)):[];
      for(const e of links){const a=positions.get(e.from),b=positions.get(e.to);svg.append(el('path',{d:`M ${a.x+90} ${a.y+64} C ${a.x+90} ${a.y+100}, ${b.x+90} ${b.y-30}, ${b.x+90} ${b.y}`,class:'kn-edge','data-from':e.from,'data-to':e.to,'marker-end':'url(#kn-arrow)'}));}
      if(!category){for(const n of nodes){const p=positions.get(n.id);svg.prepend(el('path',{d:`M ${width/2} 20 L ${p.x+90} ${p.y}`,class:'kn-edge kn-hub-edge'}));}svg.append(el('circle',{cx:width/2,cy:20,r:7,class:'kn-dot'}));svg.append(el('text',{x:width/2+16,y:25,fill:'var(--kn-text)','font-size':14},'知识花园'));}
      function highlight(id){const neighbors=new Set([id]);for(const e of links)if(e.from===id||e.to===id){neighbors.add(e.from);neighbors.add(e.to);}for(const n of svg.querySelectorAll('.kn-node'))n.classList.toggle('kn-dim',!neighbors.has(n.dataset.id));for(const e of svg.querySelectorAll('.kn-edge'))e.classList.toggle('kn-active',e.dataset.from===id||e.dataset.to===id);
        if(!category)return;const article=data.nodes.find(n=>n.id===id),all=data.edges.filter(e=>e.from===id||e.to===id),ids=new Set(all.map(e=>e.from===id?e.to:e.from));related.hidden=false;const title=document.createElement('strong');title.textContent=article.title+' · 文中链接与引用它的笔记';related.append(title);if(!ids.size)related.append(document.createTextNode(' 暂无站内文章关联。'));for(const n of data.nodes.filter(n=>ids.has(n.id))){const a=document.createElement('a');a.href=n.url;a.textContent=n.title;related.append(a);}}
      for(const n of nodes){const p=positions.get(n.id),a=el('a',n.hub?{href:'#knowledge-network',role:'button','aria-label':'展开'+n.category}:{href:n.url,'aria-label':n.title});a.classList.add('kn-node');a.dataset.id=n.id;a.append(el('title',{},n.title));a.append(el('rect',{x:p.x,y:p.y,width:184,height:70,rx:14}));a.append(el('circle',{cx:p.x+14,cy:p.y+16,r:4,class:'kn-dot'}));const chars=Array.from(n.title);for(let line=0;line<2;line++){let text=chars.slice(line*10,(line+1)*10).join('');if(line===1&&chars.length>20)text=text.slice(0,9)+'…';a.append(el('text',{x:p.x+26,y:p.y+25+line*23},text));}
        if(n.hub){a.addEventListener('click',e=>{e.preventDefault();select.value=n.category;search.value='';render();select.focus();});a.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();a.dispatchEvent(new MouseEvent('click'));}});}else{a.addEventListener('pointerenter',()=>highlight(n.id));a.addEventListener('focus',()=>highlight(n.id));}svg.append(a);}
      svg.addEventListener('pointerleave',()=>{svg.querySelectorAll('.kn-dim,.kn-active').forEach(n=>n.classList.remove('kn-dim','kn-active'));},{once:true});
      status.textContent=category?`${category} · ${nodes.length}篇匹配 · ${links.length}条分类内正文链接。聚焦节点可在下方查看跨分类关联；点击直接阅读。`:`${nodes.length}个分类入口。点击展开，再点击文章节点阅读；总览线只表示同属本站。`;
    }
    select.addEventListener('change',()=>{search.value='';zoom=1;render();});search.addEventListener('input',render);
    root.querySelector('[data-kn="plus"]').addEventListener('click',()=>{zoom=Math.min(1.6,zoom+.15);render();});root.querySelector('[data-kn="minus"]').addEventListener('click',()=>{zoom=Math.max(.6,zoom-.15);render();});root.querySelector('[data-kn="reset"]').addEventListener('click',()=>{select.value='';search.value='';zoom=1;viewport.scrollLeft=0;render();});
    render();root.querySelector('.kn-controls').hidden=false;viewport.hidden=false;root.querySelector('.kn-directory').open=false;root.dataset.ready='true';
  }
  document.addEventListener('DOMContentLoaded',init);document.addEventListener('pjax:complete',init);init();
})();
