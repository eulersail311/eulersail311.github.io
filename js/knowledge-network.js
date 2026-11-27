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

    const stateKey='sail-network-view-v2',positionCache=new Map();
    let focusIds=null,anchorId=null,explorationId=null,restoring=false;
    const tools=document.createElement('div');tools.className='kn-explore-tools';
    const fitButton=document.createElement('button');fitButton.type='button';fitButton.textContent='适应视图';fitButton.dataset.kn='fit';
    const depth=document.createElement('select');depth.setAttribute('aria-label','局部关联层数');depth.innerHTML='<option value="0">完整网络</option><option value="1">选中笔记 · 一层关联</option><option value="2">选中笔记 · 两层关联</option>';depth.dataset.kn='depth';
    const hint=document.createElement('span');hint.textContent='总览显示短标题，聚焦查看完整标题与局部关联；手机轻拖选中，点击阅读。';
    tools.append(fitButton,depth,hint);viewport.before(tools);
    const legend=document.createElement('div');legend.className='kn-legend';legend.setAttribute('aria-label','分类颜色与筛选');root.querySelector('.kn-controls').after(legend);
    const summary=document.createElement('p');summary.className='kn-summary';related.before(summary);summary.hidden=true;
    let directionMarks;
    const articlesById=new Map(data.nodes.map(article=>[article.id,article]));
    function neighborhood(id,hops){const ids=new Set([id]);let frontier=[id];for(let h=0;h<hops;h++){const next=[];for(const e of data.edges){if(frontier.includes(e.from)&&!ids.has(e.to)){ids.add(e.to);next.push(e.to);}if(frontier.includes(e.to)&&!ids.has(e.from)){ids.add(e.from);next.push(e.from);}}frontier=next;}return ids;}
    function fit(){if(!nodes.length)return;cancelAnimationFrame(frame);const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,r=svg.getBoundingClientRect(),scale=Math.abs(svg.getScreenCTM()?.a||1);kFit=Math.max(.15,Math.min(10,(r.width/scale-140)/(Math.max(...xs)-Math.min(...xs)+40),(r.height/scale-140)/(Math.max(...ys)-Math.min(...ys)+40)));camera={x:600-cx*kFit,y:400-cy*kFit,k:kFit};transform();}
    let kFit=1;
    function saveView(){if(!root.isConnected)return;try{for(const n of nodes)positionCache.set(n.id,{x:n.x,y:n.y});sessionStorage.setItem(stateKey,JSON.stringify({category:select.value,query:search.value,selected,anchorId,depth:depth.value,camera,positions:[...positionCache]}));}catch{}}
    fitButton.addEventListener('click',fit);
    function exploreFrom(id, hops) {
      anchorId=id;
      depth.value=String(hops);
      focusIds=neighborhood(id,hops);
      select.value='';
      search.value='';
      render();
      highlight(id);
      fit();
    }
    depth.addEventListener('change',()=>{if(depth.value==='0'){focusIds=null;anchorId=null;render();fit();return;}const id=explorationId||anchorId||selected;if(!id){depth.value='0';status.textContent='请先悬停或聚焦一篇笔记，再选择局部关联。';return;}exploreFrom(id,Number(depth.value));});
    root.addEventListener('click',e=>{if(e.target.closest('a[href*="/esblog/"]')&&Date.now()>=suppress)saveView();},true);
    window.addEventListener('pagehide',saveView);document.addEventListener('pjax:send',()=>{if(root.isConnected)saveView();});
    for(const [i,c] of data.categories.entries()){const button=document.createElement('button');button.type='button';button.textContent=c;button.style.setProperty('--legend-color',palette[i]);button.addEventListener('click',()=>{select.value=c;search.value='';focusIds=null;anchorId=null;depth.value='0';render();fit();});legend.append(button);}

    function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
    function transform(){layer.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.k})`);svg.dataset.zoom=String(camera.k);labels();}
    function paint(){for(const n of nodes){n.element.setAttribute('transform',`translate(${n.x} ${n.y})`);n.element.dataset.x=n.x.toFixed(2);n.element.dataset.y=n.y.toFixed(2);}for(const e of links){e.element.setAttribute('x1',e.a.x);e.element.setAttribute('y1',e.a.y);e.element.setAttribute('x2',e.b.x);e.element.setAttribute('y2',e.b.y);}transform();}
    const textMeasure=document.createElement('canvas').getContext('2d');
    function wrapTitle(title,width,pixels){textMeasure.font=`${pixels}px "Microsoft YaHei",sans-serif`;const lines=[];let line='';for(const ch of title){if(line&&textMeasure.measureText(line+ch).width>width){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);return lines;}
    function drawDirections(scale) {
      const arrows=[];
      if(selected) for(const {from,to,a,b} of links) {
        if(from!==selected && to!==selected) continue;
        const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
        if(length*scale<32) continue;
        const x=a.x+dx*.62,y=a.y+dy*.62;
        const ux=dx/length/scale,uy=dy/length/scale;
        arrows.push(`M${x-7*ux+4*uy},${y-7*uy-4*ux} L${x},${y} L${x-7*ux-4*uy},${y-7*uy+4*ux}`);
      }
      directionMarks.setAttribute('d',arrows.join(' '));
    }
    function labels(){
      if(!nodes.length)return;
      const occupied=[],r=svg.getBoundingClientRect(),scale=Math.abs(svg.getScreenCTM()?.a||1)*camera.k;if(!r.width||!r.height||!scale)return;
      drawDirections(scale);
      const matrix=layer.getScreenCTM(),points=nodes.map(n=>{const p=new DOMPoint(n.x,n.y).matrixTransform(matrix);return{id:n.id,x:p.x,y:p.y,r:Math.min(10,4+Math.sqrt(n.degree))*scale};});
      const intersects=(a,b,gap=5)=>a.x<b.x+b.w+gap&&b.x<a.x+a.w+gap&&a.y<b.y+b.h+gap&&b.y<a.y+a.h+gap;
      const ordered=[...nodes].sort((a,b)=>(b.id===selected?10000:0)+(b.element.classList.contains('kn-neighbor')?1000:0)+b.degree-((a.id===selected?10000:0)+(a.element.classList.contains('kn-neighbor')?1000:0)+a.degree));
      for(const n of ordered){const label=n.element.querySelector('text'),p=points.find(p=>p.id===n.id),isSelected=n.id===selected,pixels=isSelected?15:14,eligible=isSelected||(!selected||n.element.classList.contains('kn-neighbor'))&&(camera.k>=1.7||!!select.value||!!search.value||!!focusIds||n.degree>=8);label.style.opacity='0';n.leader.style.opacity='0';
        if(!eligible||p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom)continue;
        const short=n.title.split(/ 从|[：:]/)[0],caption=isSelected?n.title:([...short].length>18?[...short].slice(0,18).join('')+'…':short),width=Math.min(isSelected?250:170,r.width-32),key=caption+'|'+width+'|'+pixels;
        label.style.fontSize=pixels/scale+'px';label.style.fontWeight=isSelected?'600':'400';
        if(n.labelKey!==key){n.labelKey=key;label.replaceChildren(...wrapTitle(caption,width,pixels).map((line,i)=>el('tspan',{x:0,dy:i?'1.35em':'0'},line)));}
        label.setAttribute('x','0');label.setAttribute('y','0');label.removeAttribute('transform');const b=label.getBBox(),w=b.width*scale,h=b.height*scale,d=p.r+9;
        const candidates=[{x:p.x+d,y:p.y-h/2},{x:p.x-d-w,y:p.y-h/2},{x:p.x-w/2,y:p.y-d-h},{x:p.x-w/2,y:p.y+d},{x:p.x+d,y:p.y-d-h},{x:p.x-d-w,y:p.y+d}];
        if(isSelected)for(const y of[r.top+12,r.bottom-h-12])for(const x of[r.left+12,r.right-w-12])candidates.push({x,y});
        const place=candidates.find(a=>a.x>=r.left+6&&a.y>=r.top+6&&a.x+w<=r.right-6&&a.y+h<=r.bottom-6&&!occupied.some(o=>intersects({...a,w,h},o))&&!points.some(q=>q.id!==n.id&&intersects({...a,w,h},{x:q.x-q.r,y:q.y-q.r,w:q.r*2,h:q.r*2},4)));
        if(!place)continue;
        const dx=(place.x-p.x)/scale-b.x,dy=(place.y-p.y)/scale-b.y;label.setAttribute('transform',`translate(${dx} ${dy})`);label.style.opacity='1';occupied.push({...place,w,h});
        if(isSelected&&Math.hypot(place.x+w/2-p.x,place.y+h/2-p.y)>w/2+35){n.leader.setAttribute('x1','0');n.leader.setAttribute('y1','0');n.leader.setAttribute('x2',String((Math.max(place.x,Math.min(p.x,place.x+w))-p.x)/scale));n.leader.setAttribute('y2',String((Math.max(place.y,Math.min(p.y,place.y+h))-p.y)/scale));n.leader.style.opacity='1';}
      }
    }
    // Deterministic modularity moves use only real references, never category names.
    function communities(visible){const adjacency=new Map(visible.map(n=>[n.id,new Map()]));for(const e of data.edges){if(!adjacency.has(e.from)||!adjacency.has(e.to))continue;for(const[a,b]of[[e.from,e.to],[e.to,e.from]])adjacency.get(a).set(b,(adjacency.get(a).get(b)||0)+1);}const degree=new Map([...adjacency].map(([id,a])=>[id,[...a.values()].reduce((s,w)=>s+w,0)])),total=[...degree.values()].reduce((s,w)=>s+w,0),group=new Map(visible.map(n=>[n.id,n.id])),totals=new Map(degree);
      for(let pass=0;pass<30;pass++){let moved=false;for(const n of [...visible].sort((a,b)=>a.id.localeCompare(b.id))){const id=n.id,k=degree.get(id),old=group.get(id),weights=new Map();if(!k)continue;for(const[to,w]of adjacency.get(id)){const c=group.get(to);weights.set(c,(weights.get(c)||0)+w);}totals.set(old,totals.get(old)-k);let best=old,score=(weights.get(old)||0)-k*totals.get(old)/total;for(const[c,w]of weights){const gain=w-k*totals.get(c)/total;if(gain>score+1e-9){score=gain;best=c;}}group.set(id,best);totals.set(best,(totals.get(best)||0)+k);if(best!==old)moved=true;}if(!moved)break;}
      for(let pass=0;pass<visible.length;pass++){const between=new Map();for(const[id,a]of adjacency)for(const[to,w]of a){if(id>=to||group.get(id)===group.get(to))continue;const pair=[group.get(id),group.get(to)].sort().join('|');between.set(pair,(between.get(pair)||0)+w);}let best=null,gain=1e-9;for(const[pair,w]of between){const[a,b]=pair.split('|'),delta=w-totals.get(a)*totals.get(b)/total;if(delta>gain){gain=delta;best=[a,b];}}if(!best)break;const[a,b]=best;for(const[id,c]of group)if(c===b)group.set(id,a);totals.set(a,totals.get(a)+totals.get(b));totals.set(b,0);}
      const groups=new Map();for(const n of visible){const id=group.get(n.id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(n.id);}const sorted=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])),centers=new Map();
      for(const[id,members]of sorted){const radius=42*Math.sqrt(members.length)+45;let best=null;for(let t=0;t<6000;t++){const angle=t*2.399963,rad=35*Math.sqrt(t),x=Math.cos(angle)*rad,y=Math.sin(angle)*rad;if([...centers.values()].every(c=>Math.hypot(x-c.x,y-c.y)>radius+c.radius+95)){best={x,y,radius};break;}}centers.set(id,best||{x:centers.size*500,y:0,radius});}
      return{group,centers};}
    function tick(){
      for(const n of nodes){n.fx=0;n.fy=0;}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y;
        if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1*(i+1);dy=.1;}
        const d2=Math.max(100,dx*dx+dy*dy),d=Math.sqrt(d2),minimum=a.community===b.community?54:100;
        const f=Math.min(12,2200/d2+Math.max(0,minimum-d)*.18);
        a.fx-=dx/d*f;a.fy-=dy/d*f;b.fx+=dx/d*f;b.fy+=dy/d*f;
      }
      for(const e of links){const same=e.a.community===e.b.community,dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-(same?90:300))*(same?.022:.0025)/Math.sqrt(Math.max(e.a.degree,e.b.degree,1));e.a.fx+=dx/d*f;e.a.fy+=dy/d*f;e.b.fx-=dx/d*f;e.b.fy-=dy/d*f;}
      for(const n of nodes){if(n.pinned)continue;n.fx+=(n.home.x-n.x)*.012;n.fy+=(n.home.y-n.y)*.012;
        n.vx=Math.max(-10,Math.min(10,(n.vx+n.fx)*.72));n.vy=Math.max(-10,Math.min(10,(n.vy+n.fy)*.72));n.x+=n.vx;n.y+=n.vy;}
    }
    function settle(count=70){cancelAnimationFrame(frame);if(reduced){for(let i=0;i<40;i++)tick();paint();return;}steps=count;function run(){if(!root.isConnected||document.hidden){frame=0;return;}tick();paint();if(--steps>0)frame=requestAnimationFrame(run);else frame=0;}frame=requestAnimationFrame(run);}
    function clearHighlight(){selected=null;summary.hidden=true;root.classList.remove('kn-has-selection');for(const n of nodes)n.element.classList.remove('kn-dim','kn-selected','kn-neighbor');for(const e of links)e.element.classList.remove('kn-active');labels();}
    function highlight(id){
      selected=id;titleLink.textContent=data.nodes.find(n=>n.id===id).title;titleLink.href=data.nodes.find(n=>n.id===id).url;titleBar.hidden=false;summary.textContent=data.nodes.find(n=>n.id===id).description||'';summary.hidden=!summary.textContent;root.classList.add('kn-has-selection');const neighbor=new Set([id]);for(const e of data.edges)if(e.from===id||e.to===id){neighbor.add(e.from);neighbor.add(e.to);}
      for(const n of nodes){n.element.classList.toggle('kn-dim',!neighbor.has(n.id));n.element.classList.toggle('kn-selected',n.id===id);n.element.classList.toggle('kn-neighbor',n.id!==id&&neighbor.has(n.id));}
      for(const e of links)e.element.classList.toggle('kn-active',e.from===id||e.to===id);
      labels();
      renderReferences(id);
    }
    function renderReferences(id) {
      const outgoing=data.edges.filter(edge=>edge.from===id).map(edge=>edge.to);
      const incoming=data.edges.filter(edge=>edge.to===id).map(edge=>edge.from);
      const title=document.createElement('strong');
      title.textContent=articlesById.get(id).title;
      const groups=document.createElement('div');
      groups.className='kn-reference-groups';
      for(const [direction,heading,ids] of [['out','本文引用',outgoing],['in','引用本文',incoming]]) {
        const group=document.createElement('section');
        group.dataset.direction=direction;
        const label=document.createElement('h3');
        label.textContent=`${heading} · ${ids.length}`;
        group.append(label);
        if(!ids.length) {
          const empty=document.createElement('p');
          empty.textContent='暂无站内笔记';
          group.append(empty);
        }
        const list=document.createElement('ul');
        for(const target of ids) {
          const article=articlesById.get(target);
          const row=document.createElement('li');
          const link=document.createElement('a');
          link.href=article.url;
          link.textContent=article.title;
          const explore=document.createElement('button');
          explore.type='button';
          explore.textContent='看关联';
          explore.setAttribute('aria-label',`查看《${article.title}》的关联笔记`);
          explore.addEventListener('click',()=>{
            exploreFrom(target,Number(depth.value)||1);
            viewport.focus();
          });
          row.append(link,explore);
          list.append(row);
        }
        if(ids.length) group.append(list);
        groups.append(group);
      }
      related.replaceChildren(title,groups);
      related.hidden=false;
    }
    function zoom(factor,cx,cy){if(cx===undefined){const n=nodes.find(n=>n.id===selected);if(n){camera.x=600-n.x*camera.k;camera.y=400-n.y*camera.k;}cx=600;cy=400;}const k=Math.max(.15,Math.min(10,camera.k*factor)),ratio=k/camera.k;camera.x=cx-(cx-camera.x)*ratio;camera.y=cy-(cy-camera.y)*ratio;camera.k=k;transform();}
    function local(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return{x:p.x,y:p.y};}
    function render(){
      for(const n of nodes)positionCache.set(n.id,{x:n.x,y:n.y});
      cancelAnimationFrame(frame);gesture=null;explorationId=null;titleBar.hidden=true;clearHighlight();related.replaceChildren();related.hidden=true;camera={x:0,y:0,k:1};
      const category=select.value,term=search.value.trim().toLocaleLowerCase(),visible=data.nodes.filter(n=>(!focusIds||focusIds.has(n.id))&&(!category||n.category===category)&&(!term||n.title.toLocaleLowerCase().includes(term)));
      for(const button of legend.children)button.setAttribute('aria-pressed',String(button.textContent===category));
      svg.replaceChildren();svg.setAttribute('viewBox','0 0 1200 800');layer=el('g',{'class':'kn-world'});svg.append(layer);
      const layout=communities(visible),counts=new Map(),degrees=new Map();for(const e of data.edges){degrees.set(e.from,(degrees.get(e.from)||0)+1);degrees.set(e.to,(degrees.get(e.to)||0)+1);}
      nodes=visible.map(n=>{const c=data.categories.indexOf(n.category),community=layout.group.get(n.id),j=counts.get(community)||0;counts.set(community,j+1);const angle=j*2.399963,rad=40*Math.sqrt(j+1),center=layout.centers.get(community),home={x:600+center.x,y:400+center.y};return{...n,community,home,x:positionCache.get(n.id)?.x??home.x+Math.cos(angle)*rad,y:positionCache.get(n.id)?.y??home.y+Math.sin(angle)*rad,vx:0,vy:0,pinned:false,color:palette[c%palette.length],degree:degrees.get(n.id)||0};});
      const map=new Map(nodes.map(n=>[n.id,n]));
      links=data.edges.filter(e=>map.has(e.from)&&map.has(e.to)).map(e=>({...e,a:map.get(e.from),b:map.get(e.to),element:el('line',{'class':'kn-edge','data-from':e.from,'data-to':e.to})}));
      for(const e of links){e.element.classList.toggle('kn-bridge',e.a.community!==e.b.community);layer.append(e.element);}
      directionMarks=el('path',{'class':'kn-directions','aria-hidden':'true'});
      layer.append(directionMarks);
      for(const n of nodes){const a=el('a',{href:n.url,'aria-label':n.title,'class':'kn-node'+(n.degree>18?' kn-prominent':''),'data-id':n.id,'data-community':n.community,style:'--node-color:'+n.color});n.element=a;
        a.append(el('title',{},n.title));a.append(el('circle',{r:18,'class':'kn-hit'}));a.append(el('circle',{r:Math.min(10,4+Math.sqrt(n.degree)),'class':'kn-dot'}));
        n.leader=el('line',{'class':'kn-label-leader'});a.append(n.leader);const label=n.title;
        a.append(el('text',{x:13,y:5},label));a.addEventListener('pointerenter',()=>{if(!gesture)highlight(n.id);});a.addEventListener('focus',()=>{explorationId=n.id;const b=a.querySelector('.kn-dot').getBoundingClientRect(),r=viewport.getBoundingClientRect();if(b.right<r.left||b.left>r.right||b.bottom<r.top||b.top>r.bottom){camera.x=600-n.x*camera.k;camera.y=400-n.y*camera.k;transform();}highlight(n.id);});layer.append(a);n.labelWidth=a.querySelector('text').getComputedTextLength();}
      root.classList.toggle('kn-filtered',!!category||!!term);
      if(!restoring)for(let i=0;i<420;i++)tick();paint();if(!restoring){fit();if(!reduced)settle(30);}
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
      if(pinch&&pointers.size>=2){const ps=[...pointers.values()],m=local({clientX:(ps[0].x+ps[1].x)/2,clientY:(ps[0].y+ps[1].y)/2});camera.k=Math.max(.15,Math.min(10,pinch.k*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/pinch.distance));camera.x=m.x-pinch.wx*camera.k;camera.y=m.y-pinch.wy*camera.k;transform();suppress=Date.now()+600;return;}
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
    select.addEventListener('change',()=>{search.value='';focusIds=null;anchorId=null;depth.value='0';render();});search.addEventListener('input',()=>{focusIds=null;anchorId=null;depth.value='0';render();});
    root.querySelector('[data-kn="plus"]').addEventListener('click',()=>zoom(1.25));root.querySelector('[data-kn="minus"]').addEventListener('click',()=>zoom(.8));root.querySelector('[data-kn="reset"]').addEventListener('click',()=>{select.value='';search.value='';focusIds=null;anchorId=null;depth.value='0';positionCache.clear();nodes=[];render();});
    let saved=null;try{saved=JSON.parse(sessionStorage.getItem(stateKey));}catch{}
    if(saved&&data.categories.includes(saved.category)||saved&&saved.category===''){
      if(Array.isArray(saved.positions))for(const [id,p] of saved.positions){if(data.nodes.some(n=>n.id===id)&&Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.abs(p.x)<5000&&Math.abs(p.y)<5000)positionCache.set(id,p);}
      select.value=saved.category;search.value=typeof saved.query==='string'?saved.query:'';
      if(data.nodes.some(n=>n.id===saved.anchorId)&&['1','2'].includes(saved.depth)){anchorId=saved.anchorId;depth.value=saved.depth;focusIds=neighborhood(anchorId,Number(saved.depth));}
      restoring=true;
    }
    root.querySelector('.kn-controls').hidden=false;viewport.hidden=false;
    render();
    if(restoring){if(saved.camera&&['x','y','k'].every(k=>Number.isFinite(saved.camera[k]))&&saved.camera.k>=.15&&saved.camera.k<=10){camera={...saved.camera};transform();}if(data.nodes.some(n=>n.id===saved.selected)&&nodes.some(n=>n.id===saved.selected))highlight(saved.selected);root.dataset.restored='true';restoring=false;}
    root.querySelector('.kn-controls').hidden=false;viewport.hidden=false;root.querySelector('.kn-directory').open=false;root.dataset.ready='true';root.dataset.layout='force';
    if(window.ResizeObserver){const observer=new ResizeObserver(()=>{if(root.isConnected)labels();else observer.disconnect();});observer.observe(viewport);document.addEventListener('pjax:send',()=>observer.disconnect(),{once:true});}
  }
  document.addEventListener('DOMContentLoaded',init);document.addEventListener('pjax:complete',init);init();
})();
