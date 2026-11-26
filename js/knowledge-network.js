(() => {
  'use strict';
  function init() {
    const root=document.getElementById('knowledge-network');
    if(!root || root.dataset.ready) return;
    const data=JSON.parse(root.querySelector('#kn-data').textContent),select=root.querySelector('select'),search=root.querySelector('input'),svg=root.querySelector('svg'),viewport=root.querySelector('.kn-viewport'),status=root.querySelector('.kn-status'),related=root.querySelector('.kn-related');
    const titleBar=document.createElement('div');titleBar.className='kn-titlebar';titleBar.hidden=true;const titleLink=document.createElement('a');titleBar.append(titleLink);viewport.before(titleBar);
    const fullButton=document.createElement('button');fullButton.type='button';fullButton.dataset.kn='fullscreen';fullButton.textContent='全屏';fullButton.setAttribute('aria-pressed','false');root.querySelector('.kn-controls').append(fullButton);
    let full=false,placeholder=null,previousOverflow='',returnFocus=null,scrollPosition={x:0,y:0};
    async function exitFull(){if(document.fullscreenElement===root)await document.exitFullscreen().catch(()=>{});if(!full)return;full=false;root.classList.remove('kn-fullscreen');root.removeAttribute('role');root.removeAttribute('aria-modal');document.body.style.overflow=previousOverflow;if(placeholder?.parentNode){placeholder.replaceWith(root);}fullButton.textContent='全屏';fullButton.setAttribute('aria-pressed','false');window.scrollTo(scrollPosition.x,scrollPosition.y);returnFocus?.focus({preventScroll:true});}
    fullButton.addEventListener('click',async()=>{if(full){await exitFull();return;}returnFocus=document.activeElement;scrollPosition={x:window.scrollX,y:window.scrollY};previousOverflow=document.body.style.overflow;placeholder=document.createComment('network fullscreen');root.before(placeholder);document.body.append(root);full=true;root.classList.add('kn-fullscreen');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');document.body.style.overflow='hidden';fullButton.textContent='退出全屏';fullButton.setAttribute('aria-pressed','true');fullButton.focus();if(root.requestFullscreen)try{await root.requestFullscreen();if(!full&&document.fullscreenElement===root)await document.exitFullscreen();}catch{}});
    document.addEventListener('fullscreenchange',()=>{if(full&&!document.fullscreenElement)exitFull();});
    root.addEventListener('keydown',e=>{if(!full)return;if(e.key==='Escape'){e.preventDefault();exitFull();}if(e.key==='Tab'){const focusable=[...root.querySelectorAll('button,input,select,a[href],[tabindex="0"]')].filter(n=>n.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    document.addEventListener('pjax:send',()=>{if(full)exitFull();});
    const NS='http://www.w3.org/2000/svg',palette=['#9b7ee0','#47a6ba','#d99a52','#dc7d9a','#6faa75','#7c9ed9','#b49b51','#b587c4'];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let nodes=[],links=[],layer,frame=0,steps=0,camera={x:0,y:0,k:1},gesture=null,suppress=0,selected=null;
    function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
    function transform(){layer.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.k})`);svg.dataset.zoom=String(camera.k);labels();}
    function paint(){for(const n of nodes){n.element.setAttribute('transform',`translate(${n.x} ${n.y})`);n.element.dataset.x=n.x.toFixed(2);n.element.dataset.y=n.y.toFixed(2);}for(const e of links){e.element.setAttribute('x1',e.a.x);e.element.setAttribute('y1',e.a.y);e.element.setAttribute('x2',e.b.x);e.element.setAttribute('y2',e.b.y);}transform();labels();}
    function labels(){
      const occupied=[];
      const ordered=[...nodes].sort((a,b)=>(b.id===selected?10000:0)+(b.element.classList.contains('kn-neighbor')?1000:0)+b.degree-((a.id===selected?10000:0)+(a.element.classList.contains('kn-neighbor')?1000:0)+a.degree));
      for(const n of ordered){const box={x:n.x+13,y:n.y-10,w:n.labelWidth||280,h:17};const eligible=camera.k>=2||!!select.value||!!search.value||n.degree>18||n.id===selected||n.element.classList.contains('kn-neighbor');const clash=occupied.some(b=>box.x<b.x+b.w+6&&b.x<box.x+box.w+6&&box.y<b.y+b.h+4&&b.y<box.y+box.h+4);const show=eligible&&!clash;n.element.querySelector('text').style.opacity=show?'1':'0';if(show)occupied.push(box);}
    }
    function tick(){
      for(const n of nodes){n.fx=0;n.fy=0;}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y;
        if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1*(i+1);dy=.1;}
        const d2=Math.max(100,dx*dx+dy*dy),d=Math.sqrt(d2),minimum=select.value?64:30;
        const f=Math.min(9,1100/d2+Math.max(0,minimum-d)*.12);
        a.fx-=dx/d*f;a.fy-=dy/d*f;b.fx+=dx/d*f;b.fy+=dy/d*f;
      }
      for(const e of links){const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-(select.value?110:76))*.018;e.a.fx+=dx/d*f;e.a.fy+=dy/d*f;e.b.fx-=dx/d*f;e.b.fy-=dy/d*f;}
      for(const n of nodes){if(n.pinned)continue;n.fx+=(600-n.x)*.0015;n.fy+=(400-n.y)*.0015;
        n.vx=(n.vx+n.fx)*.72;n.vy=(n.vy+n.fy)*.72;n.x=Math.max(32,Math.min(1168,n.x+n.vx));n.y=Math.max(32,Math.min(768,n.y+n.vy));}
    }
    function settle(count=70){cancelAnimationFrame(frame);if(reduced){for(let i=0;i<40;i++)tick();paint();return;}steps=count;function run(){if(!root.isConnected||document.hidden){frame=0;return;}tick();paint();if(--steps>0)frame=requestAnimationFrame(run);else frame=0;}frame=requestAnimationFrame(run);}
    function clearHighlight(){selected=null;root.classList.remove('kn-has-selection');for(const n of nodes)n.element.classList.remove('kn-dim','kn-selected','kn-neighbor');for(const e of links)e.element.classList.remove('kn-active');labels();}
    function highlight(id){
      selected=id;titleLink.textContent=data.nodes.find(n=>n.id===id).title;titleLink.href=data.nodes.find(n=>n.id===id).url;titleBar.hidden=false;root.classList.add('kn-has-selection');const neighbor=new Set([id]);for(const e of data.edges)if(e.from===id||e.to===id){neighbor.add(e.from);neighbor.add(e.to);}
      for(const n of nodes){n.element.classList.toggle('kn-dim',!neighbor.has(n.id));n.element.classList.toggle('kn-selected',n.id===id);n.element.classList.toggle('kn-neighbor',n.id!==id&&neighbor.has(n.id));}
      for(const e of links)e.element.classList.toggle('kn-active',e.from===id||e.to===id);
      labels();
      related.replaceChildren();related.hidden=false;const article=data.nodes.find(n=>n.id===id),title=document.createElement('strong');title.textContent=article.title+' · 关联笔记';related.append(title);
      const others=data.nodes.filter(n=>n.id!==id&&neighbor.has(n.id));if(!others.length)related.append(document.createTextNode(' 暂无站内关联。'));for(const n of others){const a=document.createElement('a');a.href=n.url;a.textContent=n.title;related.append(a);}
    }
    function zoom(factor,cx=600,cy=400){const k=Math.max(.35,Math.min(10,camera.k*factor)),ratio=k/camera.k;camera.x=cx-(cx-camera.x)*ratio;camera.y=cy-(cy-camera.y)*ratio;camera.k=k;transform();}
    function local(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return{x:p.x,y:p.y};}
    function render(){
      cancelAnimationFrame(frame);gesture=null;titleBar.hidden=true;clearHighlight();related.replaceChildren();related.hidden=true;camera={x:0,y:0,k:1};
      const category=select.value,term=search.value.trim().toLocaleLowerCase(),visible=data.nodes.filter(n=>(!category||n.category===category)&&(!term||n.title.toLocaleLowerCase().includes(term)));
      svg.replaceChildren();svg.setAttribute('viewBox','0 0 1200 800');layer=el('g',{'class':'kn-world'});svg.append(layer);
      const counts=new Map(),degrees=new Map();for(const e of data.edges){degrees.set(e.from,(degrees.get(e.from)||0)+1);degrees.set(e.to,(degrees.get(e.to)||0)+1);}
      nodes=visible.map((n,i)=>{const c=data.categories.indexOf(n.category),a=c*Math.PI*2/8,j=counts.get(c)||0;counts.set(c,j+1);const angle=j*2.399963,rad=28*Math.sqrt(j+1),center=category?{x:600,y:400}:{x:600+Math.cos(a)*300,y:400+Math.sin(a)*230};return{...n,x:center.x+Math.cos(angle)*rad,y:center.y+Math.sin(angle)*rad,vx:0,vy:0,pinned:false,color:palette[c%palette.length],degree:degrees.get(n.id)||0};});
      const map=new Map(nodes.map(n=>[n.id,n]));
      links=data.edges.filter(e=>map.has(e.from)&&map.has(e.to)).map(e=>({...e,a:map.get(e.from),b:map.get(e.to),element:el('line',{'class':'kn-edge','data-from':e.from,'data-to':e.to})}));
      for(const e of links)layer.append(e.element);
      for(const n of nodes){const a=el('a',{href:n.url,'aria-label':n.title,'class':'kn-node'+(n.degree>18?' kn-prominent':''),'data-id':n.id,style:'--node-color:'+n.color});n.element=a;
        a.append(el('title',{},n.title));a.append(el('circle',{r:18,'class':'kn-hit'}));a.append(el('circle',{r:Math.min(10,4+Math.sqrt(n.degree)),'class':'kn-dot'}));
        const label=n.title;
        a.append(el('text',{x:13,y:5},label));a.addEventListener('pointerenter',()=>{if(!gesture)highlight(n.id);});a.addEventListener('focus',()=>{const b=a.querySelector('.kn-dot').getBoundingClientRect(),r=viewport.getBoundingClientRect();if(b.right<r.left||b.left>r.right||b.bottom<r.top||b.top>r.bottom){camera.x=600-n.x*camera.k;camera.y=400-n.y*camera.k;transform();}highlight(n.id);});layer.append(a);n.labelWidth=a.querySelector('text').getComputedTextLength();}
      root.classList.toggle('kn-filtered',!!category||!!term);
      for(let i=0;i<260;i++)tick();if(!category&&(viewport.clientWidth||root.clientWidth)<600)camera={x:-900,y:-600,k:2.5};paint();settle(35);
      status.textContent=`${category||'全部分类'} · ${nodes.length}篇笔记 · ${links.length}条正文引用。拖动圆点调整位置，拖动空白平移；滚轮或按钮缩放，点击圆点打开文章。颜色表示分类，连线不代表难度。`;
    }
    const pointers=new Map();let pinch=null;
    svg.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;cancelAnimationFrame(frame);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){
        if(gesture?.node)gesture.node.pinned=false;gesture=null;
        const ps=[...pointers.values()],mid={clientX:(ps[0].x+ps[1].x)/2,clientY:(ps[0].y+ps[1].y)/2},m=local(mid);
        pinch={distance:Math.max(1,Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)),k:camera.k,wx:(m.x-camera.x)/camera.k,wy:(m.y-camera.y)/camera.k};
        for(const id of pointers.keys())svg.setPointerCapture(id);suppress=Date.now()+600;return;
      }
      if(pointers.size>2||gesture)return;
      const target=e.target.closest('.kn-node'),n=target&&nodes.find(n=>n.id===target.dataset.id);if(n){n.pinned=true;target.focus({preventScroll:true});}
      gesture={pointer:e.pointerId,node:n,startX:e.clientX,startY:e.clientY,last:local(e),moved:false,capture:n?target:svg};gesture.capture.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pinch&&pointers.size>=2){const ps=[...pointers.values()],m=local({clientX:(ps[0].x+ps[1].x)/2,clientY:(ps[0].y+ps[1].y)/2});camera.k=Math.max(.35,Math.min(10,pinch.k*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/pinch.distance));camera.x=m.x-pinch.wx*camera.k;camera.y=m.y-pinch.wy*camera.k;transform();suppress=Date.now()+600;return;}
      if(!gesture||gesture.pointer!==e.pointerId)return;const p=local(e),g=gesture;if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>6)g.moved=true;if(!g.moved)return;
      if(g.node){g.node.x+=(p.x-g.last.x)/camera.k;g.node.y+=(p.y-g.last.y)/camera.k;g.node.vx=g.node.vy=0;}else{camera.x+=p.x-g.last.x;camera.y+=p.y-g.last.y;}g.last=p;paint();
    });
    function end(e){
      pointers.delete(e.pointerId);
      if(pinch){suppress=Date.now()+600;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(!pointers.size)pinch=null;return;}
      if(!gesture||gesture.pointer!==e.pointerId)return;const g=gesture;if(g.moved)suppress=Date.now()+450;if(g.node)g.node.pinned=false;gesture=null;if(g.capture.hasPointerCapture(e.pointerId))g.capture.releasePointerCapture(e.pointerId);if(g.node&&g.moved)settle(55);
    }
    svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    svg.addEventListener('click',e=>{if(Date.now()<suppress){e.preventDefault();e.stopPropagation();}else if(!e.target.closest('.kn-node')){clearHighlight();related.hidden=true;titleBar.hidden=true;}},true);
    svg.addEventListener('wheel',e=>{e.preventDefault();const p=local(e);zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.004),p.x,p.y);},{passive:false});
    viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const offsets={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};if(offsets[e.key]){e.preventDefault();camera.x+=offsets[e.key][0];camera.y+=offsets[e.key][1];transform();}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.2);}else if(e.key==='-'){e.preventDefault();zoom(1/1.2);}});
    select.addEventListener('change',()=>{search.value='';render();});search.addEventListener('input',render);
    root.querySelector('[data-kn="plus"]').addEventListener('click',()=>zoom(1.25));root.querySelector('[data-kn="minus"]').addEventListener('click',()=>zoom(.8));root.querySelector('[data-kn="reset"]').addEventListener('click',()=>{select.value='';search.value='';render();});
    render();root.querySelector('.kn-controls').hidden=false;viewport.hidden=false;root.querySelector('.kn-directory').open=false;root.dataset.ready='true';root.dataset.layout='force';
  }
  document.addEventListener('DOMContentLoaded',init);document.addEventListener('pjax:complete',init);init();
})();
