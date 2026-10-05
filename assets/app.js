
try{(function(){var NEW_MS=window.IRAM_NEW_DAYS_MS||7*864e5;var now=new Date();document.querySelectorAll('.frag-cell[data-added]').forEach(function(c){var added=new Date(c.getAttribute('data-added'));if(now-added<NEW_MS&&!c.querySelector('.tag-new')){var t=document.createElement('span');t.className='tag tag-new';t.textContent='NEW';c.appendChild(t)}else if(now-added>=NEW_MS){c.removeAttribute('data-added')}});document.querySelectorAll('.frag-card[data-added]').forEach(function(card){var added=new Date(card.getAttribute('data-added')),fresh=!isNaN(added)&&(now-added)<NEW_MS;var badge=card.querySelector('.pc-badge-new');if(fresh&&!badge){var b=document.createElement('span');b.className='pc-badge pc-badge-new';b.textContent='NEW';var media=card.querySelector('.pc-media');if(media){var w=media.querySelector('.pc-wish');media.insertBefore(b,w||null)}}else if(!fresh){if(badge)badge.remove();card.removeAttribute('data-added')}})})();}catch(e){console.warn('NEW tag init failed:',e)}

try{(function(){
  var cats=['brand','gender','scent','season','occasion','time','weather','mood','family','price'];
  var f={};cats.forEach(function(c){f[c]='all'});
  window.__filterState=f;
  function priceMatch(val,spec){
    if(!spec||spec==='all')return true;
    var p=parseFloat(val);
    if(isNaN(p))return false;
    var parts=String(spec).split('-');
    var lo=parseFloat(parts[0]),hi=parseFloat(parts[1]);
    if(isNaN(lo))return false;
    if(isNaN(hi))return p>=lo;
    return p>=lo&&p<=hi;
  }
  window.__priceMatch=priceMatch;
  var resultsDiv=document.createElement('div');
  resultsDiv.id='filterResults';
  resultsDiv.style.display='none';
  resultsDiv.innerHTML='<table><thead><tr><th>Fragrance</th><th>3ml</th><th>5ml</th><th>7.5ml</th><th>10ml</th><th>20ml</th><th>30ml</th><th>Reminds Me Of</th><th>Links</th></tr></thead><tbody></tbody></table>';
  var container=document.querySelector('.container');
  container.insertBefore(resultsDiv,container.querySelector('.section-heading'));
  var brandCounts={};
  document.querySelectorAll('.frag-cell[data-brand]').forEach(function(frag){
    var b=frag.getAttribute('data-brand');
    if(b)brandCounts[b]=(brandCounts[b]||0)+1;
  });
  var filterBody=document.getElementById('filterPanelBody');
  if(filterBody){
    var brands=Object.keys(brandCounts).sort(),brandHtml='<div class="filter-group" role="radiogroup" aria-labelledby="fgBrand" id="filterBrandGroup"><div class="filter-group-h" id="fgBrand">Brand</div><div class="filter-opts wide"><button type="button" class="filter-btn active" data-filter="all" role="radio" aria-checked="true"><i class="filter-dot" aria-hidden="true"></i>Any brand</button>';
    brands.forEach(function(brand){brandHtml+='<button type="button" class="filter-btn" data-brand="'+brand.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" role="radio" aria-checked="false"><i class="filter-dot" aria-hidden="true"></i>'+brand+' ('+brandCounts[brand]+')</button>'});
    brandHtml+='</div></div>';
    filterBody.insertAdjacentHTML('afterbegin',brandHtml);
  }
  document.querySelectorAll('.filter-btn').forEach(function(b){
    b.addEventListener('click',function(){
      if(this.classList.contains('active'))return;
      var group=this.parentElement;
      group.querySelectorAll('.filter-btn').forEach(function(o){o.classList.remove('active')});
      this.classList.add('active');
      var cat=null;
      for(var i=0;i<cats.length;i++){if(this.dataset[cats[i]]){cat=cats[i];break}}
      if(cat){f[cat]=this.dataset[cat]}
      else if(this.dataset.filter==='all'){
        for(var i=0;i<cats.length;i++){if(group.querySelector('[data-'+cats[i]+']')){f[cats[i]]='all';break}}
      }
      applyFilter();
    });
  });
  function applyFilter(){
    var showAll=true;
    var isMobile=window.innerWidth<=768;
    for(var i=0;i<cats.length;i++){if(f[cats[i]]!=='all'){showAll=false;break}}
    var tbody=resultsDiv.querySelector('tbody');
    if(showAll){
      document.querySelectorAll('.table-wrap>.frag-table').forEach(function(t){t.style.display=''});
      document.querySelectorAll('.section-heading').forEach(function(s){s.style.display=''});
      resultsDiv.style.display='none';
      document.querySelectorAll('.frag-card').forEach(function(c){c.style.display=''});
    }else{
      document.querySelectorAll('.table-wrap>.frag-table').forEach(function(t){t.style.display='none'});
      document.querySelectorAll('.section-heading').forEach(function(s){s.style.display='none'});
      document.querySelectorAll('.frag-card').forEach(function(card){
        var match=true;
        for(var i=0;i<cats.length;i++){
          var cat=cats[i];
          if(f[cat]==='all')continue;
          if(cat==='price'){if(!priceMatch(card.dataset.price,f.price)){match=false;break}continue}
          var vals=card.dataset[cat]?card.dataset[cat].split(','):[];
          if(vals.indexOf(f[cat])===-1){match=false;break}
        }
        card.style.display=match?'':'none';
      });
      tbody.innerHTML='';
      document.querySelectorAll('.table-wrap>.frag-table tbody tr').forEach(function(row){
        var cell=row.querySelector('.frag-cell');
        if(!cell)return;
        for(var i=0;i<cats.length;i++){
          var cat=cats[i];
          if(f[cat]==='all')continue;
          if(cat==='price'){if(!priceMatch(cell.dataset.price,f.price))return;continue}
          var vals=cell.dataset[cat]?cell.dataset[cat].split(','):[];
          if(vals.indexOf(f[cat])===-1)return
        }
        var nr=document.createElement('tr');
        var nt=document.createElement('td');
        nt.className='frag-cell';
        nt.innerHTML=cell.innerHTML;
        for(var ai=0;ai<cell.attributes.length;ai++){
          var at=cell.attributes[ai];
          if(at.name.indexOf('data-')===0)nt.setAttribute(at.name,at.value);
        }
        if(cell._cartData)nt._cartData=cell._cartData;
        if(cell.dataset.brand){
          var bd=document.createElement('div');
          bd.className='res-brand';
          bd.textContent=cell.dataset.brand;
          var cb=nt.querySelector('.cart-btn');
          nt.insertBefore(bd,cb||null);
        }
        nr.appendChild(nt);
        row.querySelectorAll('.size-cell').forEach(function(pc){
          var td=document.createElement('td');
          td.className='size-cell';
          td.innerHTML=pc.innerHTML;
          nr.appendChild(td);
        });
        var ic=row.querySelector('.inspired-cell');
        if(ic){var itd=document.createElement('td');itd.className='inspired-cell';itd.innerHTML=ic.innerHTML;nr.appendChild(itd)}
        var lc=row.querySelector('.links-cell');
        if(lc){var ltd=document.createElement('td');ltd.className='links-cell';ltd.innerHTML=lc.innerHTML;nr.appendChild(ltd)}
        tbody.appendChild(nr);
      });
      resultsDiv.style.display=isMobile?'none':'';
    }
    if(window.__onFilterChange)window.__onFilterChange();
  }
  window.__applyFilter=applyFilter;
})();}catch(e){console.warn('Filters init failed:',e)}

try{(function(){
  var mn=document.getElementById('priceMin'),mx=document.getElementById('priceMax');
  if(!mn||!mx)return;
  var fill=document.getElementById('priceFill'),vLo=document.getElementById('priceValLo'),vHi=document.getElementById('priceValHi');
  var anyBtn=document.querySelector('#filterPriceGroup .filter-btn[data-filter="all"]');
  var f=window.__filterState;
  if(!f)return;
  var vals=[];
  document.querySelectorAll('.frag-cell[data-price]').forEach(function(c){var p=parseInt(c.getAttribute('data-price'),10);if(!isNaN(p))vals.push(p)});
  if(!vals.length)return;
  var MIN=Math.floor(Math.min.apply(null,vals)/10)*10;
  var MAX=Math.ceil(Math.max.apply(null,vals)/10)*10;
  mn.min=MIN;mn.max=MAX;mn.step=5;
  mx.min=MIN;mx.max=MAX;mx.step=5;
  mn.value=MIN;mx.value=MAX;
  function money(n){return '\u20B9'+Number(n).toLocaleString('en-IN')}
  function label(spec){
    if(!spec||spec==='all')return 'Any price';
    var p=String(spec).split('-');
    var lo=parseInt(p[0],10),hi=parseInt(p[1],10);
    if(isNaN(lo))return 'Any price';
    if(isNaN(hi)||hi>=MAX)return money(lo)+' and above';
    return money(lo)+'\u2013'+money(hi);
  }
  window.__priceLabel=label;
  function paint(){
    var a=parseInt(mn.value,10),b=parseInt(mx.value,10);
    var span=(MAX-MIN)||1;
    var l=((a-MIN)/span)*100,r=((b-MIN)/span)*100;
    if(fill){fill.style.left=l+'%';fill.style.width=Math.max(0,r-l)+'%'}
    if(vLo)vLo.textContent=money(a);
    if(vHi)vHi.textContent=money(b)+(b>=MAX?'+':'');
  }
  function setAnyActive(on){
    if(!anyBtn)return;
    anyBtn.classList.toggle('active',!!on);
    anyBtn.setAttribute('aria-checked',on?'true':'false');
  }
  function currentSpec(){
    var a=parseInt(mn.value,10),b=parseInt(mx.value,10);
    if(a<=MIN&&b>=MAX)return 'all';
    return a+'-'+b;
  }
  function sync(apply){
    var a=parseInt(mn.value,10),b=parseInt(mx.value,10);
    if(a>b){if(document.activeElement===mn){mx.value=a}else{mn.value=b}}
    paint();
    var spec=currentSpec();
    f.price=spec;
    setAnyActive(spec==='all');
    if(apply&&window.__applyFilter)window.__applyFilter();
  }
  mn.addEventListener('input',function(){sync(true)});
  mx.addEventListener('input',function(){sync(true)});
  mn.addEventListener('change',function(){sync(true)});
  mx.addEventListener('change',function(){sync(true)});
  if(anyBtn)anyBtn.addEventListener('click',function(){mn.value=MIN;mx.value=MAX;paint();setAnyActive(true)});
  window.__setPriceRange=function(spec){
    if(!spec||spec==='all'){mn.value=MIN;mx.value=MAX}
    else{var p=String(spec).split('-');mn.value=parseInt(p[0],10)||MIN;mx.value=parseInt(p[1],10)||MAX}
    sync(false);
  };
  window.__priceRangeReady=true;
  sync(false);
})();}catch(e){console.warn('Price range init failed:',e)}

try{(function(){
  function slugify(brand,name){return(brand+'-'+name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function fmt(n){return n?('\u20B9'+Number(n).toLocaleString('en-IN')):''}
  document.querySelectorAll('.table-wrap').forEach(function(wrap){
    var table=wrap.querySelector('.frag-table');
    if(!table)return;
    // seo-gen pre-renders the .frag-cards grid (products.json is the source of
    // truth) — only build cards dynamically when that static grid is absent
    var hasStatic=!!wrap.querySelector(':scope>.frag-cards');
    var heading=wrap.previousElementSibling;
    var division=heading?heading.textContent.trim():'';
    var cc=null;
    if(!hasStatic){
      cc=document.createElement('div');
      cc.className='frag-cards';
      cc.setAttribute('aria-label',division);
    }
    var bName='',bSrc='';
    table.querySelectorAll('tbody tr').forEach(function(row){
      var bc=row.querySelector('.brand-cell');
      if(bc){
        bName=bc.textContent.replace(/\s+/g,' ').trim();
        var img=bc.querySelector('img');
        bSrc=img?img.getAttribute('src'):'';
      }
      var fc=row.querySelector('.frag-cell');
      if(!fc)return;
      if(hasStatic){
        fc.querySelectorAll('.tag').forEach(function(t){
          if(t.textContent.trim()==='SOLD OUT')row.classList.add('pc-sold');
        });
        return;
      }
      var nameA=fc.querySelector('a');
      var fName=nameA?nameA.textContent.replace(/\s+/g,' ').trim():'';
      var gTag='',isSO=false,isCS=false,isNew=false;
      fc.querySelectorAll('.tag').forEach(function(t){
        var st=t.textContent.trim();
        if(st==='SOLD OUT'){isSO=true}
        else if(st==='COMING SOON'){isCS=true}
        else if(st==='NEW'){isNew=true}
        if(t.classList.contains('tag-men'))gTag='Men';
        else if(t.classList.contains('tag-women'))gTag='Women';
        else if(t.classList.contains('tag-unisex'))gTag='Unisex';
      });
      var cells=row.querySelectorAll('.size-cell');
      var prices=[],available=[];
      cells.forEach(function(c){
        prices.push(parseInt(c.textContent.replace(/[^0-9]/g,''),10)||0);
        available.push(!c.querySelector('s')&&!c.querySelector('.u-price'));
      });
      var ic=row.querySelector('.inspired-cell');
      var iText=ic?ic.textContent.replace(/\s+/g,' ').trim():'';
      var lc=row.querySelector('.links-cell');
      var linksHtml=lc?lc.innerHTML:'';
      var pid=bName+'|'+fName;
      var slug=nameA?nameA.getAttribute('href').replace(/^fragrance\//,'').replace(/\.html$/,''):slugify(bName,fName);
      var minAvail=null;
      for(var i=0;i<prices.length;i++){if(available[i]&&(minAvail===null||prices[i]<minAvail))minAvail=prices[i]}
      var badges='';
      if(isSO){badges+='<span class="pc-badge pc-badge-so">SOLD OUT</span>'}
      else if(isCS){badges+='<span class="pc-badge pc-badge-cs">COMING SOON</span>'}
      if(isNew){badges+='<span class="pc-badge pc-badge-new">NEW</span>'}
      var card=document.createElement('div');
      card.className='frag-card'+(isSO?' pc-sold':'');
      card.setAttribute('data-pid',pid);
      card.setAttribute('data-product',slug);
      card.setAttribute('data-division',division);
      for(var i=0;i<fc.attributes.length;i++){
        var a=fc.attributes[i];
        if(a.name.indexOf('data-')===0&&!card.getAttribute(a.name))card.setAttribute(a.name,a.value);
      }
        if(gTag)card.setAttribute('data-gender',gTag);
      if(isSO)row.classList.add('pc-sold');
      if(fc.getAttribute('data-added'))card.setAttribute('data-added',fc.getAttribute('data-added'));
      var famTxt=fc.getAttribute('data-family')?fc.getAttribute('data-family').split(',').slice(0,2).join(' · '):'';
      var slotInsp=(iText||'').replace(/\s+/g,' ').trim();
      var showInsp=!!(slotInsp&&slotInsp.length>1&&slotInsp!=='Original');
      var slotTxt=showInsp?slotInsp:famTxt;
      var slotHtml=slotTxt?'<span class="card-inspired pc-inspired"'+(showInsp?' title="Reminds me of: '+esc(slotInsp)+'"':'')+'>'+(showInsp?'&#8618; ':'')+esc(slotTxt)+'</span>':'';
      card.innerHTML='<div class="pc-media" role="button" tabindex="0" data-open>'
        +'<span class="pc-ph" aria-hidden="true"></span>'
        +'<img class="pc-img" alt="'+esc(fName)+'" loading="lazy" data-img-base="images/bottles/'+slug+'">'
        +badges
        +'<button type="button" class="pc-wish" aria-label="Save '+esc(fName)+'" data-wish></button>'
        +(isSO||isCS?'':'<button type="button" class="pc-cmp" aria-label="Add '+esc(fName)+' to compare" data-cmp aria-pressed="false"></button>')
        +(gTag?'<span class="pc-gender pc-gender-'+gTag.toLowerCase()+'">'+gTag+'</span>':'')
        +'</div>'
        +'<div class="card-top">'+(bSrc?'<img src="'+esc(bSrc)+'" alt="" class="card-brand-logo" loading="lazy">':'')+'<span class="card-brand-name">'+esc(bName)+'</span></div>'
        +'<button type="button" class="card-frag-name pc-name" data-open>'+esc(fName)+'</button>'
        +slotHtml
        +'<div class="pc-price-line">'
        +'<span class="pc-from">from <b>'+fmt(minAvail)+'</b></span>'
        +(available[5]?'<span class="pc-30">30ml '+fmt(prices[5])+'</span>':'')
        +'</div>'
        +(linksHtml?'<div class="card-links">'+linksHtml+'</div>':'')
        +'<button type="button" class="pc-add'+(isSO?' pc-add-so':isCS?' pc-add-cs':'')+'" data-open '+(isSO||isCS?'disabled':'')+'>'+(isSO?'SOLD OUT':isCS?'COMING SOON':'Add')+'</button>';
      cc.appendChild(card);
    });
    if(cc)wrap.appendChild(cc);
  });
  function initImg(el){
    el.classList.add('pc-img-err');
    var base=el.getAttribute('data-img-base'),exts=['.webp','.png','.jpg','.jpeg'],i=0;
    function loadNext(){
      if(!base||i>=exts.length)return;
      var im=new Image();
      im.onload=function(){
        el.src=im.src;
        if(exts[i-1]==='.webp'){
          el.srcset=base+'-500.webp 500w, '+base+'.webp 1024w';
          el.sizes='152px';
        }
        el.classList.remove('pc-img-err');el.classList.add('loaded');var ph=el.parentElement&&el.parentElement.querySelector('.pc-ph');if(ph)ph.style.display='none'
      };
      im.onerror=loadNext;
      im.src=base+exts[i++];
    }
    loadNext();
  }
  var io='IntersectionObserver' in window?new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){initImg(e.target);io.unobserve(e.target)}});
  },{rootMargin:'200px'}):null;
  document.querySelectorAll('.pc-img').forEach(function(el){if(io)io.observe(el);else initImg(el)});
  var brandTrack=document.getElementById('mobileBrandTrack');
  if(brandTrack&&brandTrack.children.length){
    brandTrack.addEventListener('click',function(e){
      var chip=e.target.closest('.mobile-brand-chip');if(!chip)return;
      var brand=chip.getAttribute('data-brand');
      var card=Array.prototype.slice.call(document.querySelectorAll('.frag-card')).find(function(c){var n=c.querySelector('.card-brand-name');return n&&n.textContent.trim()===brand&&c.style.display!=='none'});
      if(card)card.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
  function wireRail(track){
    if(!track||!track.children.length)return;
    track.addEventListener('click',function(e){
      var f=e.target.closest('.feat-card,.best-card');if(!f)return;
      var pid=f.getAttribute('data-pid');
      var card=pid?document.querySelector('.frag-card[data-pid="'+pid+'"]'):null;
      if(!card)return;
      card.scrollIntoView({behavior:'smooth',block:'center'});
      var opener=card.querySelector('[data-open]');
      if(opener)setTimeout(function(){opener.click()},350);
    });
  }
  wireRail(document.getElementById('featuredTrack'));
  wireRail(document.getElementById('bestsellersTrack'));
  function wishIds(){try{return JSON.parse(localStorage.getItem('iram_wishlist')||'[]')}catch(e){return[]}}
  function syncWishes(){var on={};wishIds().forEach(function(id){on[id]=true});document.querySelectorAll('.frag-card').forEach(function(card){var btn=card.querySelector('[data-wish]');if(btn)btn.classList.toggle('active',!!on[card.getAttribute('data-product')])})}
  syncWishes();
  document.addEventListener('click',function(e){var b=e.target.closest('[data-wish]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();var card=b.closest('.frag-card'),id=card&&card.getAttribute('data-product');if(!id)return;var ids=wishIds(),at=ids.indexOf(id);if(at>-1)ids.splice(at,1);else ids.push(id);try{localStorage.setItem('iram_wishlist',JSON.stringify(ids))}catch(e){}syncWishes();if(window.__syncWishlist)window.__syncWishlist();if(window.__toast){var nm=(card.querySelector('.card-frag-name')||{textContent:''}).textContent.trim();window.__toast(nm+(at>-1?' removed from':' saved to')+' wishlist')}});
  var total=document.querySelectorAll('.frag-card').length,count=document.getElementById('mobileCatalogueCount');if(count)count.textContent=total+'+ fragrances';
})();}catch(e){console.warn('Mobile cards init failed:',e)}

try{(function(){
  var listOverlay=document.getElementById('pcListOverlay');
  var wishSheet=document.getElementById('pcWishSheet'),wishBody=document.getElementById('pcWishBody');
  var cmpSheet=document.getElementById('pcCmpSheet'),cmpBody=document.getElementById('pcCmpBody');
  if(!listOverlay||!wishSheet||!cmpSheet)return;
  var WISH='iram_wishlist',CMP='iram_compare',MAXCMP=4;
  var SIZES=['3ml','5ml','7.5ml','10ml','20ml','30ml'];
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function fmt(n){return n?('\u20B9'+Number(n).toLocaleString('en-IN')):''}
  function read(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function prodOf(id){
    if(!id)return null;
    var P=window._products||{};
    if(P[id])return P[id];
    var card=document.querySelector('.frag-card[data-product="'+id+'"]');
    var pid=card&&card.getAttribute('data-pid');
    return pid&&P[pid]?P[pid]:null;
  }
  function cheapest(d){
    if(!d)return null;
    var best=null;
    (d.prices||[]).forEach(function(p,i){if(d.available[i]&&p>0&&(best===null||p<best.price))best={price:p,i:i}});
    if(best===null)return null;
    best.size=SIZES[best.i]||'3ml';
    return best;
  }
  function thumbOf(id){
    var card=null;
    if(id.indexOf('|')>-1)card=document.querySelector('.frag-card[data-pid="'+id.replace(/"/g,'')+'"]');
    if(!card)card=document.querySelector('.frag-card[data-product="'+id+'"]');
    if(card){
      var img=card.querySelector('.pc-img[data-img-base]');
      if(img)return img.getAttribute('data-img-base')+'.png';
    }
    return '';
  }
  function open(sheet){
    listOverlay.classList.add('open');
    sheet.classList.add('open');
    document.body.classList.add('pc-lock');
    var c=sheet.querySelector('.pc-sheet-close');if(c)c.focus();
  }
  function closeAll(){
    listOverlay.classList.remove('open');
    wishSheet.classList.remove('open');
    cmpSheet.classList.remove('open');
    document.body.classList.remove('pc-lock');
  }
  function syncCmpBtns(){
    var on={};read(CMP).forEach(function(id){on[id]=true});
    document.querySelectorAll('.frag-card [data-cmp]').forEach(function(b){
      var card=b.closest('.frag-card'),id=card&&card.getAttribute('data-pid');
      var sel=!!(id&&on[id]);
      b.classList.toggle('active',sel);
      b.setAttribute('aria-pressed',sel?'true':'false');
    });
  }
  function rowHtml(id,kind){
    var d=prodOf(id);
    if(!d)return '';
    var c=cheapest(d);
    var img=thumbOf(id);
    var stock=d.isSoldOut?'<span class="lt-out">Sold out</span>':d.isComingSoon?'<span class="lt-soon">Coming soon</span>':'';
    var price=c?fmt(c.price)+' <small>/ '+c.size+'</small>':stock;
    var acts='';
    if(kind==='wish'){
      acts='<button type="button" class="lt-act" data-lt-move="'+esc(id)+'"'+(c?'':' disabled')+'>Move to cart</button>'
        +'<button type="button" class="lt-act lt-ghost" data-lt-drop="'+esc(id)+'" aria-label="Remove from wishlist">Remove</button>';
    }else{
      acts='<button type="button" class="lt-act" data-lt-add="'+esc(id)+'"'+(c?'':' disabled')+'>Add</button>'
        +'<button type="button" class="lt-act lt-ghost" data-lt-un="'+esc(id)+'" aria-label="Remove from compare">Remove</button>';
    }
    return '<div class="lt-row'+(d.isSoldOut?' pc-sold':'')+'" data-lt-id="'+esc(id)+'">'
      +'<span class="lt-thumb">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'')+'</span>'
      +'<span class="lt-meta"><b>'+esc(d.frag)+'</b><small>'+esc(d.brand)+(d.gender?' · '+esc(d.gender):'')+'</small><span class="lt-price">'+price+'</span></span>'
      +'<span class="lt-acts">'+acts+'</span></div>';
  }
  function renderWish(){
    var ids=read(WISH).filter(function(id){return prodOf(id)});
    wishBody.innerHTML=ids.length?ids.map(function(id){return rowHtml(id,'wish')}).join(''):'<div class="cart-empty">Your wishlist is empty<br><small>Tap the ♥ on any fragrance to save it.</small></div>';
    var t=document.getElementById('pcWishTitle');
    if(t)t.textContent=ids.length?'Wishlist ('+ids.length+')':'Wishlist';
  }
  function renderCmp(){
    var ids=read(CMP).filter(function(id){return prodOf(id)});
    var cnt=document.getElementById('pcCmpCount');
    if(cnt)cnt.textContent=ids.length?'('+ids.length+'/'+MAXCMP+')':'';
    if(!ids.length){
      cmpBody.innerHTML='<div class="cart-empty">Nothing to compare yet<br><small>Add up to 4 fragrances using the ⇄ button.</small></div>';
      return;
    }
    var rows=ids.map(function(id){return rowHtml(id,'cmp')}).join('');
    var prods=ids.map(function(id){return prodOf(id)}).filter(Boolean);
    var grid='<div class="lt-specs"><table class="lt-table"><tbody>'
      +specRow('Brand',prods.map(function(p){return p.brand}))
      +specRow('Gender',prods.map(function(p){return p.gender||'—'}))
      +specRow('Inspired by',prods.map(function(p){return p.inspired||'—'}))
      +specRow('Size range',prods.map(function(p){
        var ok=(p.available||[]).filter(Boolean).length;
        return ok?ok+' sizes':'—';
      }))
      +specRow('From',prods.map(function(p){var c=cheapest(p);return c?fmt(c.price):'—'}))
      +specRow('30ml',prods.map(function(p){return (p.available||[])[5]?fmt((p.prices||[])[5]):'—'}))
      +'</tbody></table></div>';
    cmpBody.innerHTML=rows+grid;
  }
  function specRow(label,vals){
    if(!vals.length)return '';
    return '<tr><th scope="row">'+esc(label)+'</th>'+vals.map(function(v){return '<td>'+esc(v)+'</td>'}).join('')+'</tr>';
  }
  window.__openWishlist=function(){renderWish();open(wishSheet)};
  window.__openCompare=function(){renderCmp();open(cmpSheet)};
  window.__syncCompare=syncCmpBtns;
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-cmp]');
    if(b){
      e.preventDefault();e.stopImmediatePropagation();
      var card=b.closest('.frag-card'),id=card&&card.getAttribute('data-pid');
      if(!id)return;
      var ids=read(CMP).filter(function(x){return prodOf(x)});
      var at=ids.indexOf(id);
      if(at>-1)ids.splice(at,1);
      else if(ids.length>=MAXCMP){ids.shift();ids.push(id)}
      else ids.push(id);
      write(CMP,ids);
      syncCmpBtns();
      if(cmpSheet.classList.contains('open'))renderCmp();
      if(window.__toast){
        var nm2=(card.querySelector('.card-frag-name')||{textContent:''}).textContent.trim();
        window.__toast(at>-1?nm2+' removed from compare':ids.length+' of '+MAXCMP+' in compare');
      }
      return;
    }
    var t=e.target.closest('[data-lt-move],[data-lt-add]');
    if(t){
      var pid=t.getAttribute('data-lt-move')||t.getAttribute('data-lt-add');
      var d=prodOf(pid),c=d&&cheapest(d);
      if(d&&c&&window.__iramAddToCart){
        window.__iramAddToCart(d.brand,d.frag,c.size,c.price);
        t.textContent='Added ✓';t.disabled=true;
        setTimeout(function(){t.textContent='Move to cart';t.disabled=false},1400);
      }
      return;
    }
    var dd=e.target.closest('[data-lt-drop],[data-lt-un]');
    if(dd){
      var pid2=dd.getAttribute('data-lt-drop')||dd.getAttribute('data-lt-un');
      var key=dd.hasAttribute('data-lt-drop')?WISH:CMP;
      write(key,read(key).filter(function(x){return x!==pid2}));
      if(key===WISH){renderWish();syncWish()}
      else{renderCmp();syncCmpBtns()}
      return;
    }
  });
  function syncWish(){
    var on={};read(WISH).forEach(function(id){on[id]=true});
    document.querySelectorAll('.frag-card').forEach(function(card){var btn=card.querySelector('[data-wish]');if(btn)btn.classList.toggle('active',!!on[card.getAttribute('data-product')])});
  }
  window.__syncWishlist=syncWish;
  document.getElementById('pcWishClose').addEventListener('click',closeAll);
  document.getElementById('pcCmpClose').addEventListener('click',closeAll);
  listOverlay.addEventListener('click',closeAll);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&listOverlay.classList.contains('open'))closeAll()});
  setTimeout(syncCmpBtns,0);
})();}catch(e){console.warn('Wishlist/Compare init failed:',e)}

try{(function(){
  var CATS=['brand','gender','scent','season','occasion','time','weather','mood','family','price'];
  var bar=document.getElementById('filterBar');
  var panel=document.getElementById('filterPanel');
  if(!panel)return;
  var body=document.getElementById('filterPanelBody');
  var panelHome=panel.parentElement,panelNext=panel.nextSibling;
  var sheet=document.getElementById('pcFilterSheet');
  var fb=document.getElementById('pcFilterBody');
  var overlay=document.getElementById('pcFilterOverlay');
  var btn=document.getElementById('pcFilterBtn');
  var brandBtn=document.getElementById('pcBrandBtn');
  var trig=document.getElementById('filterTrigger');
  var closeBtn=document.getElementById('pcFilterClose');
  var panelX=document.getElementById('filterPanelX');
  var countEl=document.getElementById('pcFilterCount');
  var trigN=document.getElementById('filterTriggerN');
  var cntDesk=document.getElementById('filterCount');
  var cntMob=document.getElementById('filterCountMobile');
  var chipBoxDesk=document.getElementById('filterChips');
  var chipBoxMob=document.getElementById('filterChipsMobile');
  var chipBoxPanel=document.getElementById('filterPanelChips');
  var clearDesk=document.getElementById('filterClear');
  var clearMob=document.getElementById('filterClearMobile');
  var applyBtn=document.getElementById('filterApply');
  function isSheetOpen(){return sheet&&sheet.classList.contains('open')}
  function activeList(){
    var st=window.__filterState||{},out=[];
    for(var i=0;i<CATS.length;i++){
      var v=st[CATS[i]];
      if(v&&v!=='all'){
        var b,label;
        if(CATS[i]==='price'){
          b=body.querySelector('#filterPriceGroup .filter-btn[data-filter="all"]');
          label=window.__priceLabel?window.__priceLabel(v):v;
        }else{
          b=body.querySelector('.filter-btn[data-'+CATS[i]+'="'+v+'"]');
          label=b?b.textContent.trim():v;
        }
        out.push({cat:CATS[i],val:v,btn:b,label:label});
      }
    }
    return out;
  }
  function resultCount(){
    var act=activeList();
    if(!act.length)return document.querySelectorAll('.table-wrap .frag-cell').length;
    return document.querySelectorAll('#filterResults tbody tr').length;
  }
  function clearAll(){
    for(var g=0;g<24;g++){
      var a=activeList();
      if(!a.length)return;
      var any=a[0].btn.parentElement.querySelector('.filter-btn[data-filter="all"]');
      if(!any)return;
      any.click();
    }
  }
  function chipHtml(a){
    return '<button type="button" class="filter-chip" data-cat="'+a.cat+'" data-val="'+a.val+'" aria-label="Remove filter '+a.label+'" title="Remove '+a.label+'">'+a.label+'<span class="filter-chip-x" aria-hidden="true">&times;</span></button>';
  }
  function renderChips(list,box){
    if(!box)return;
    if(!list.length){box.innerHTML='';box.hidden=true;return}
    box.innerHTML=list.map(chipHtml).join('');
    box.hidden=false;
  }
  function setText(el,txt){if(el)el.textContent=txt}
  function updateUI(){
    var act=activeList();
    var n=act.length;
    var total=resultCount();
    if(countEl){countEl.textContent=n;countEl.hidden=!n}
    if(trigN){trigN.textContent=n;trigN.hidden=!n}
    if(btn)btn.classList.toggle('active',n>0);
    if(trig)trig.classList.toggle('active',n>0);
    if(brandBtn)brandBtn.classList.toggle('active',(window.__filterState||{}).brand!=='all');
    var label=n?(total===1?'1 fragrance found':total+' fragrances found'):(total===1?'1 fragrance':total+' fragrances');
    setText(cntDesk,label);
    setText(cntMob,label);
    if(clearMob)clearMob.hidden=!n;
    renderChips(act,chipBoxDesk);
    renderChips(act,chipBoxMob);
    renderChips(act,chipBoxPanel);
    if(applyBtn){
      applyBtn.textContent=n?(total===1?'Show 1 fragrance':'Show '+total+' fragrances'):'Show all fragrances';
      applyBtn.disabled=!total;
    }
    var groups=body.querySelectorAll('.filter-opts');
    for(var i=0;i<groups.length;i++){
      var opts=groups[i].querySelectorAll('.filter-btn');
      for(var j=0;j<opts.length;j++)opts[j].setAttribute('aria-checked',opts[j].classList.contains('active')?'true':'false');
    }
  }
  function onChip(e){
    var c=e.target.closest('.filter-chip');
    if(!c)return;
    var b;
    if(c.dataset.cat==='price'){
      b=body.querySelector('#filterPriceGroup .filter-btn[data-filter="all"]');
    }else{
      b=body.querySelector('.filter-btn[data-'+c.dataset.cat+'="'+c.dataset.val+'"]');
    }
    if(!b)return;
    var any=b.parentElement.querySelector('.filter-btn[data-filter="all"]');
    if(any)any.click();
  }
  [chipBoxDesk,chipBoxMob,chipBoxPanel].forEach(function(b){if(b)b.addEventListener('click',onChip)});
  if(clearDesk)clearDesk.addEventListener('click',clearAll);
  if(clearMob)clearMob.addEventListener('click',clearAll);
  function setExpanded(v){
    if(trig)trig.setAttribute('aria-expanded',v?'true':'false');
    if(btn)btn.setAttribute('aria-expanded',v?'true':'false');
    if(brandBtn)brandBtn.setAttribute('aria-expanded',v?'true':'false');
  }
  function toSheet(){if(panel.parentElement!==fb)fb.appendChild(panel)}
  function toHome(){if(panel.parentElement===fb&&panelHome)panelHome.insertBefore(panel,panelNext)}
  function openSheet(){
    closePanel(false);
    toSheet();
    sheet.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('pc-lock');
    setExpanded(true);
    if(closeBtn)closeBtn.focus();
  }
  function closeSheet(){
    toHome();
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('pc-lock');
    setExpanded(false);
    if(btn)btn.focus();
  }
  function fitPanel(){
    if(!panel||panel.hidden)return;
    panel.style.maxHeight='';
    if(window.innerWidth<=1023)return;
    var host=document.getElementById('filterPanelHost');
    if(!host)return;
    var top=host.getBoundingClientRect().bottom+8;
    var avail=window.innerHeight-top-12;
    if(avail>180)panel.style.maxHeight=Math.min(580,Math.floor(avail))+'px';
  }
  function openPanel(){
    if(isSheetOpen())return;
    panel.hidden=false;
    fitPanel();
    setExpanded(true);
    panel.focus();
  }
  function closePanel(refocus){
    if(panel.hidden)return;
    panel.hidden=true;
    setExpanded(false);
    if(refocus&&trig)trig.focus();
  }
  if(btn)btn.addEventListener('click',function(e){e.preventDefault();openSheet()});
  if(brandBtn)brandBtn.addEventListener('click',function(e){
    e.preventDefault();
    var mob=window.innerWidth<=1023;
    if(mob)openSheet();else openPanel();
    setTimeout(function(){
      var g=document.getElementById('filterBrandGroup');
      if(!g)return;
      g.scrollIntoView({block:'start',behavior:'smooth'});
      var first=g.querySelector('.filter-btn:not(.active)');
      if(first&&mob===false)first.focus();
    },80);
  });
  if(trig)trig.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    if(panel.hidden)openPanel();else closePanel(true);
  });
  if(closeBtn)closeBtn.addEventListener('click',closeSheet);
  if(panelX)panelX.addEventListener('click',function(){if(isSheetOpen())closeSheet();else closePanel(true)});
  if(applyBtn)applyBtn.addEventListener('click',function(){if(isSheetOpen())closeSheet();else closePanel(true)});
  if(overlay)overlay.addEventListener('click',closeSheet);
  document.addEventListener('click',function(e){
    if(panel.hidden||isSheetOpen())return;
    if(!e.target||!e.target.isConnected)return;
    if(bar.contains(e.target)||(trig&&trig.contains(e.target)))return;
    closePanel(false);
  });
  function trapTab(e,box){
    if(e.key!=='Tab')return;
    var f=box.querySelectorAll('a[href],button:not([disabled]),select:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      if(isSheetOpen()){closeSheet();return}
      if(!panel.hidden){closePanel(true);return}
    }
    if(e.key==='Tab'){
      if(isSheetOpen())trapTab(e,sheet);
      else if(!panel.hidden)trapTab(e,panel);
    }
  });
  window.addEventListener('resize',function(){
    if(window.innerWidth>1023){
      if(isSheetOpen())closeSheet();
      toHome();
      closePanel(false);
    }else if(!isSheetOpen()&&!panel.hidden){
      closePanel(false);
    }
  });
  window.__onFilterChange=updateUI;
  updateUI();
})();}catch(e){console.warn('Filter sheet init failed:',e)}

try{(function(){
  var sel=document.getElementById('pcSort');
  if(!sel)return;
  function pcCost(d){
    var cost=null;
    if(d&&d.prices){
      for(var i=0;i<d.prices.length;i++){
        if(d.available[i]&&(cost===null||d.prices[i]<cost))cost=d.prices[i];
      }
    }
    return cost;
  }
  function pcCompare(mode){
    return function(a,b){
      if(mode==='low')return (a._pcCost===null?1e9:a._pcCost)-(b._pcCost===null?1e9:b._pcCost);
      if(mode==='high')return (b._pcCost===null?-1:b._pcCost)-(a._pcCost===null?-1:a._pcCost);
      if(mode==='name')return a._pcName<b._pcName?-1:a._pcName>b._pcName?1:0;
      if(mode==='new')return b._pcAdded<a._pcAdded?-1:b._pcAdded>a._pcAdded?1:0;
      return 0;
    };
  }
  // desktop catalogue: sort product rows GLOBALLY across the whole table (all
  // brand blocks). Brand labels (.brand-cell) and their .brand-sep top border are
  // hidden while a global sort is active; the pristine order + labels come back
  // for the default "Recommended" view.
  function sortTable(table,mode){
    if(!table._pcOrig){
      // snapshot the pristine row order once (rows can move between tbodies)
      var snap=[];
      Array.prototype.slice.call(table.querySelectorAll('tbody')).forEach(function(tb){
        Array.prototype.slice.call(tb.children).forEach(function(r){
          snap.push({row:r,tb:tb,sep:r.classList.contains('brand-sep')});
        });
      });
      table._pcOrig=snap;
    }
    var orig=table._pcOrig;
    if(!orig.length)return;
    // always start from the pristine arrangement (restores parents, order, labels)
    var parents=[],groups=[];
    orig.forEach(function(e){
      var found=-1;
      for(var i=0;i<parents.length;i++){if(parents[i]===e.tb){found=i;break}}
      if(found<0){parents.push(e.tb);groups.push([]);found=parents.length-1}
      e.row.style.display='';
      if(e.sep)e.row.classList.add('brand-sep');
      var bc=e.row.querySelector('.brand-cell');
      if(bc)bc.style.display='';
      groups[found].push(e.row);
    });
    for(var gi=0;gi<parents.length;gi++){
      for(var ri=0;ri<groups[gi].length;ri++)parents[gi].appendChild(groups[gi][ri]);
    }
    if(mode==='featured')return;
    var products=[];
    orig.forEach(function(e){
      var cell=e.row.querySelector('.frag-cell');
      if(!cell)return;
      var d=(window._products||{})[cell.getAttribute('data-pid')];
      e.row._pcCost=pcCost(d);
      var a=cell.querySelector('a[href*="fragrance/"]');
      e.row._pcName=a?a.textContent.trim().toLowerCase():'';
      e.row._pcAdded=cell.getAttribute('data-added')||'';
      products.push(e.row);
    });
    products.sort(pcCompare(mode));
    orig.forEach(function(e){
      var bc=e.row.querySelector('.brand-cell');
      if(bc)bc.style.display='none';
      e.row.classList.remove('brand-sep');
    });
    var mainTb=orig[0].tb;
    products.forEach(function(r){mainTb.appendChild(r)});
  }
  function applySort(mode){
    var cmp=pcCompare(mode);
    document.querySelectorAll('.frag-cards').forEach(function(grid){
      var cards=Array.prototype.slice.call(grid.querySelectorAll('.frag-card'));
      cards.forEach(function(c){
        c._pcCost=pcCost(c._cartData);
        var nm=c.querySelector('.card-frag-name');
        c._pcName=nm?nm.textContent.trim().toLowerCase():'';
        c._pcAdded=c.getAttribute('data-added')||'';
      });
      if(mode==='featured'){
        cards.forEach(function(c){c.style.order=''});
      }else{
        cards.sort(cmp);
        cards.forEach(function(c,i){c.style.order=i});
      }
    });
    if(window.innerWidth>1023){
      document.querySelectorAll('.table-wrap>.frag-table').forEach(function(t){sortTable(t,mode)});
      if(window.__applyFilter)window.__applyFilter();
    }
  }
  window.__applySort=applySort;
  function syncSort(v){
    if(sel.value!==v)sel.value=v;
    var b=document.getElementById('filterSort');
    if(b&&b.value!==v)b.value=v;
  }
  window.__syncSort=syncSort;
  sel.addEventListener('change',function(){applySort(sel.value);syncSort(sel.value)});
  var bs=document.getElementById('filterSort');
  if(bs)bs.addEventListener('change',function(){applySort(bs.value);syncSort(bs.value)});
})();}catch(e){console.warn('Sort init failed:',e)}

try{(function(){
  var ORDER=['brand','gender','scent','season','occasion','time','weather','mood','family'];
  function writeUrl(){
    try{
      var st=window.__filterState||{},q=[];
      ORDER.forEach(function(k){if(st[k]&&st[k]!=='all')q.push(k+'='+encodeURIComponent(st[k]))});
      if(st.price&&st.price!=='all')q.push('price='+encodeURIComponent(st.price));
      var ss=document.getElementById('filterSort');
      if(ss&&ss.value&&ss.value!=='featured')q.push('sort='+ss.value);
      var url=location.pathname+(q.length?'?'+q.join('&'):'')+location.hash;
      history.replaceState(null,'',url);
    }catch(e){}
  }
  window.__syncUrl=writeUrl;
  var prev=window.__onFilterChange;
  window.__onFilterChange=function(){if(prev)prev();writeUrl()};
  ['filterSort','pcSort'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('change',function(){setTimeout(writeUrl,0)});
  });
  function readUrl(){
    try{
      var q=new URLSearchParams(location.search);
      if(!q.toString())return;
      var body=document.getElementById('filterPanelBody');
      if(!body)return;
      var clicked=false;
      ORDER.forEach(function(k){
        var v=q.get(k);if(!v)return;
        var b=body.querySelector('.filter-btn[data-'+k+'="'+v.replace(/"/g,'&quot;')+'"]');
        if(b){b.click();clicked=true}
      });
      var price=q.get('price');
      if(price&&/^\d+-\d+$/.test(price)){if(window.__setPriceRange)window.__setPriceRange(price);if(window.__applyFilter)window.__applyFilter();clicked=true}
      var sort=q.get('sort');
      if(sort){
        ['filterSort','pcSort'].forEach(function(id){var s=document.getElementById(id);if(s&&s.querySelector('option[value="'+sort+'"]'))s.value=sort});
        if(window.__applySort)window.__applySort(sort);
        if(window.__syncSort)window.__syncSort(sort);
      }
      writeUrl();
    }catch(e){console.warn('URL restore failed:',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',readUrl);else readUrl();
})();}catch(e){console.warn('URL sync init failed:',e)}

try{(function(){
  var sizes=['3ml','5ml','7.5ml','10ml','20ml','30ml'];
  var attrs=['scent','season','occasion','time','weather','mood','family'];
  var _products={};
  // registry is built from the inline products payload (products.json via
  // seo-gen) instead of scraping the table DOM — one source of truth
  function dec(s){return String(s==null?'':s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')}
  var list=window.__PRODUCTS||[];
  if(!list.length)throw new Error('window.__PRODUCTS missing');
  list.forEach(function(p){
    var prices=[],available=[];
    sizes.forEach(function(sz){
      var k=sz.replace('ml','');
      prices.push(p.prices[k]||0);
      available.push(p.statusPerSize[k]==='ok');
    });
    var data={id:p.key,brand:p.brand,frag:p.name,gender:p.gender||'',badges:(p.tags||[]).join(' '),prices:prices,available:available,inspired:dec(p.inspired||''),links:p.links||'',attrs:{},isSoldOut:p.status==='soldout',isComingSoon:p.status==='coming'};
    attrs.forEach(function(a){if(p[a])data.attrs[a]=p[a].split(',')});
    _products[p.key]=data;
  });

  document.querySelectorAll('.frag-table').forEach(function(table){
    var curBrand='';
    table.querySelectorAll('tbody tr').forEach(function(row){
      var bc=row.querySelector('.brand-cell');
      if(bc)curBrand=bc.textContent.trim();
      var fc=row.querySelector('.frag-cell');
      if(!fc)return;
      var cartBtn=document.createElement('button');
      cartBtn.className='cart-btn';
      cartBtn.innerHTML='\uD83D\uDED2 Add to Cart';
      fc.appendChild(cartBtn);
      var pid=fc.getAttribute('data-pid');
      if(!pid){
        var nameA=fc.querySelector('a');
        var fragName=nameA?nameA.textContent.replace(/\s+/g,' ').trim():'';
        pid=curBrand+'|'+fragName;
      }
      var data=_products[pid];
      if(!data){console.warn('[Cart] no registry entry for',pid);return}
      fc._cartData=data;
      fc.setAttribute('data-pid',pid);
      if(data.gender)fc.setAttribute('data-gender',data.gender);
      if(data.isSoldOut||data.isComingSoon){cartBtn.disabled=true;cartBtn.textContent=data.isComingSoon?'Coming soon':'Sold out';cartBtn.classList.add('cart-btn-so')}
    });
  });

  document.querySelectorAll('.frag-card').forEach(function(card){
    var pid=card.getAttribute('data-pid');
    if(!pid){
      var bn=card.querySelector('.card-brand-name');
      var fn=card.querySelector('.card-frag-name');
      if(!bn||!fn)return;
      pid=bn.textContent.trim()+'|'+fn.textContent.trim();
    }
    if(_products[pid]){card._cartData=_products[pid];card.setAttribute('data-pid',pid)}
  });

  window._products=_products;
})();}catch(e){console.warn('Cart data init failed:',e)}
try{(function(){
  var cart=[];
  try{var _raw=localStorage.getItem('iram_cart');cart=_raw?JSON.parse(_raw):[]}catch(e){cart=[]}
  if(!Array.isArray(cart))cart=[];
  var sizes=['3ml','5ml','7.5ml','10ml','20ml','30ml'];
  (function reconcileCart(){
    var data=window._products||{};
    if(!data||!Object.keys(data).length)return;
    var changed=false,dropped=0,repriced=0,kept=[];
    for(var ri=0;ri<cart.length;ri++){
      var it=cart[ri];
      if(!it||typeof it!=='object'||!it.brand||!it.frag){changed=true;dropped++;continue}
      var d=data[it.brand+'|'+it.frag];
      var idx=sizes.indexOf(it.size);
      if(!d||idx<0||!d.available||!d.available[idx]){changed=true;dropped++;continue}
      var q=Math.max(1,Math.min(99,parseInt(it.qty,10)||1));
      if(q!==it.qty){it.qty=q;changed=true}
      var cur=d.prices[idx];
      if(cur&&Number(it.price)!==cur){it.price=cur;changed=true;repriced++}
      it.key=it.brand+'|'+it.frag+'|'+it.size;
      kept.push(it);
    }
    if(kept.length!==cart.length)cart=kept;
    if(changed){
      save();
      setTimeout(function(){
        if(!window.__toast)return;
        if(dropped)window.__toast(dropped+' unavailable item'+(dropped===1?'':'s')+' removed from your cart','err');
        else if(repriced)window.__toast('Cart prices updated to current values','ok');
      },600);
    }
  })();
  var floatBtn=document.getElementById('cartFloat');
  var floatCount=document.getElementById('cartFloatCount');
  var drawer=document.getElementById('cartDrawer');
  var drawerOverlay=document.getElementById('cartDrawerOverlay');
  var drawerBody=document.getElementById('cartDrawerBody');
  var closeDrawerBtn=document.getElementById('cartCloseDrawer');
  var subtotalEl=document.getElementById('cartSubtotal');
  var shippingEl=document.getElementById('cartShipping');
  var totalEl=document.getElementById('cartTotal');
  var copyBtn=document.getElementById('cartCopyOrder');
  var whatsappBtn=document.getElementById('cartWhatsApp');
  var ssPopup=document.getElementById('sizeSelector');
  var ssOverlay=document.getElementById('sizeSelectorOverlay');
  var shipProgress=document.getElementById('shipProgress');
  var shipProgressFill=document.getElementById('shipProgressFill');
  var shipProgressText=document.getElementById('shipProgressText');
  var shipProgressTitle=document.getElementById('shipProgressTitle');
  var cartStats=document.getElementById('cartStats');
  var cartStatItems=document.getElementById('cartStatItems');
  var cartStatFrags=document.getElementById('cartStatFrags');
  var cartStatDecants=document.getElementById('cartStatDecants');
  var headerCount=document.getElementById('cartHeaderCount');
  var clearBtn=document.getElementById('cartClearBtn');
  var shipPartners=document.getElementById('shipPartners');
  var cartShipLabel=document.getElementById('cartShipLabel');
  var mobileCartBar=document.getElementById('mobileCartBar');
  var mobileCartSummary=document.getElementById('mobileCartSummary');
  var mobileCartThumbs=document.getElementById('mobileCartThumbs');
  var mobileCartHeadCount=document.getElementById('mobileCartHeadCount');

  var PARTNERS={
    tirupati:{name:'Tirupati',fee:0},
    dtdc:{name:'DTDC',fee:0},
    xpressbee:{name:'Xpressbee',fee:20},
    delhivery:{name:'Delhivery',fee:40},
    bluedart:{name:'Bluedart',fee:80}
  };
  var partnerId='tirupati';
  try{var _dp=localStorage.getItem('iram_delivery');if(PARTNERS[_dp])partnerId=_dp}catch(e){}

  function save(){try{localStorage.setItem('iram_cart',JSON.stringify(cart))}catch(e){}}
  function partner(){return PARTNERS[partnerId]}
  function surcharge(){return partner().fee}
  function parsePrice(c){return parseInt(c.textContent.trim().replace(/[^0-9]/g,''),10)||0}
  function isAvail(c){return!c.querySelector('s')&&!c.querySelector('.u-price')}
  function fmt(n){return'\u20B9'+n.toLocaleString('en-IN')}
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function totalItems(){var n=0;for(var i=0;i<cart.length;i++)n+=cart[i].qty;return n}
  function subtotal(){var t=0;for(var i=0;i<cart.length;i++)t+=cart[i].price*cart[i].qty;return t}
  var FREE_SHIP_MIN=999,FREE_SHIP_MIN_QTY=2;
  function baseShipping(s){return(s>=FREE_SHIP_MIN&&totalItems()>=FREE_SHIP_MIN_QTY)?0:100}
  function shipping(s){return baseShipping(s)+surcharge()}

  function addToCart(brand,frag,size,price,qty){
    var n=Math.max(1,Math.min(99,parseInt(qty,10)||1));
    var key=brand+'|'+frag+'|'+size;
    var found=false;
    for(var i=0;i<cart.length;i++){if(cart[i].key===key){cart[i].qty+=n;found=true;break}}
    if(!found)cart.push({key:key,brand:brand,frag:frag,size:size,price:price,qty:n});
    save();renderCart();bounceFloat();
    if(window.__toast)window.__toast((n>1?n+'\u00D7 ':'')+size+' '+frag+' added to cart');
  }
  window.__iramAddToCart=addToCart;
  function changeQty(key,d){
    for(var i=0;i<cart.length;i++){
      if(cart[i].key===key){cart[i].qty+=d;if(cart[i].qty<=0)cart.splice(i,1);break}
    }
    save();renderCart();
  }
  function removeItem(key){cart=cart.filter(function(x){return x.key!==key});save();renderCart()}

  function renderCart(){
    var n=totalItems();
    var sub=subtotal();
    var ship=shipping(sub);
    var tot=sub+ship;
    var uniqueFrags=0;
    var fragSet={};
    var decantEst=0;
    for(var i=0;i<cart.length;i++){
      var it=cart[i];
      var fk=it.brand+'|'+it.frag;
      if(!fragSet[fk]){fragSet[fk]=1;uniqueFrags++}
      decantEst+=it.qty;
    }
    floatCount.textContent=n;
    floatCount.classList.remove('pulse');
    void floatCount.offsetWidth;
    if(n>0)floatCount.classList.add('pulse');
    floatBtn.classList.toggle('visible',n>0);
    if(mobileCartBar)mobileCartBar.classList.toggle('visible',n>0);
    if(mobileCartSummary){
      var txt=n+' item'+(n===1?'':'s')+'\u00B7'+fmt(tot);
      if(mobileCartSummary.textContent!==txt){
        mobileCartSummary.textContent=txt;
        mobileCartSummary.classList.remove('bump');
        void mobileCartSummary.offsetWidth;
        mobileCartSummary.classList.add('bump');
      }
    }
    if(mobileCartThumbs){
      var seen={},thumbs='',shown=0;
      for(var ti=0;ti<cart.length&&shown<3;ti++){
        var k=cart[ti].brand+'|'+cart[ti].frag;
        if(seen[k])continue;seen[k]=1;
        var pc=document.querySelector('.frag-card[data-pid="'+k.replace(/"/g,'')+'"] .pc-img[data-img-base]');
        if(pc){thumbs+='<img src="'+pc.getAttribute('data-img-base')+'.png" alt="">';shown++}
      }
      var extra=n-shown;
      if(extra>0)thumbs+='<span class="mcb-more">+'+extra+'</span>';
      if(mobileCartThumbs.innerHTML!==thumbs)mobileCartThumbs.innerHTML=thumbs;
    }
    if(mobileCartHeadCount){mobileCartHeadCount.textContent=n;mobileCartHeadCount.classList.toggle('visible',n>0)}
    headerCount.textContent=n>0?'('+n+')':'';
    if(!cart.length){
      drawerBody.innerHTML='<div class="cart-empty">Your cart is empty</div>';
      shipProgress.style.display='none';
      shipPartners.style.display='none';
      cartStats.style.display='none';
    }
    else{
      var h='';
      for(var i=0;i<cart.length;i++){
        var it=cart[i];
        h+='<div class="cart-item"><div class="cart-item-info"><div class="cart-item-brand">'+esc(it.brand)+'</div><div class="cart-item-name">'+esc(it.frag)+'</div><div class="cart-item-size">'+it.size+' \u2014 '+fmt(it.price)+'</div></div><div class="cart-item-actions"><button class="cart-qty-btn" data-action="minus" data-key="'+esc(it.key)+'">\u2212</button><span class="cart-qty-val">'+it.qty+'</span><button class="cart-qty-btn" data-action="plus" data-key="'+esc(it.key)+'">+</button><button class="cart-remove-btn" data-action="remove" data-key="'+esc(it.key)+'">\u2715</button></div></div>';
      }
      drawerBody.innerHTML=h;
      shipProgress.style.display='';
      shipPartners.style.display='';
      cartStats.style.display='';
      var radios=shipPartners.querySelectorAll('input[name="shipPartner"]');
      for(var ri=0;ri<radios.length;ri++)radios[ri].checked=radios[ri].value===partnerId;
      var qtyOk=n>=FREE_SHIP_MIN_QTY;
      var moneyOk=sub>=FREE_SHIP_MIN;
      var unlocked=moneyOk&&qtyOk;
      var pct=Math.min(Math.round(sub/FREE_SHIP_MIN*100),100);
      shipProgressFill.style.width=pct+'%';
      shipProgressFill.classList.toggle('done',unlocked);
      if(unlocked){
        shipProgressTitle.innerHTML='&#10003; Free Shipping Progress';
        shipProgressText.innerHTML='<span style="color:#2e7d32;font-weight:600">&#10003; Congratulations! You unlocked FREE SHIPPING!</span>';
      }
      else{
        shipProgressTitle.innerHTML='&#128666; Free Shipping Progress';
        if(moneyOk&&!qtyOk){
          var missing=FREE_SHIP_MIN_QTY-n;
          shipProgressText.innerHTML='Add <strong>'+missing+' more item'+(missing===1?'':'s')+'</strong> to unlock <strong>FREE SHIPPING!</strong>';
        }
        else{
          shipProgressText.innerHTML='<strong>'+pct+'%</strong> \u2014 '+fmt(sub)+' / '+fmt(FREE_SHIP_MIN)+'<br>Only '+fmt(FREE_SHIP_MIN-sub)+' more for <strong>FREE SHIPPING!</strong>';
        }
      }
      cartStatItems.textContent=n;
      cartStatFrags.textContent=uniqueFrags;
      cartStatDecants.textContent=decantEst;
    }
    subtotalEl.textContent=fmt(sub);
    var extraFee=surcharge();
    cartShipLabel.textContent=extraFee?'Shipping \u00B7 '+partner().name+' (+'+fmt(extraFee)+')':'Shipping \u00B7 '+partner().name;
    shippingEl.textContent=ship===0?'FREE':fmt(ship);
    totalEl.textContent=fmt(tot);
    clearBtn.style.display=cart.length?'':'none';
  }

  function bounceFloat(){floatBtn.classList.add('cart-bounce');setTimeout(function(){floatBtn.classList.remove('cart-bounce')},400)}

  function showSizeSelector(cartData){
    var avail=[];
    for(var i=0;i<cartData.prices.length;i++){
      if(cartData.available[i])avail.push({size:sizes[i],price:cartData.prices[i]});
    }
    if(!avail.length)return;
    var h='<div class="ss-title">Select Size</div><div class="ss-subtitle">'+esc(cartData.brand)+' \u2014 '+esc(cartData.frag)+'</div>';
    for(var i=0;i<avail.length;i++){
      h+='<label class="ss-option"><input type="radio" name="ssSize" value="'+avail[i].size+'" data-price="'+avail[i].price+'"><span>'+avail[i].size+'</span><span class="ss-price">'+fmt(avail[i].price)+'</span></label>';
    }
    ssPopup.innerHTML=h;
    ssPopup.setAttribute('data-brand',cartData.brand);
    ssPopup.setAttribute('data-frag',cartData.frag);
    ssPopup.classList.add('open');
    ssOverlay.classList.add('open');
  }

  function closeSS(){ssPopup.classList.remove('open');ssOverlay.classList.remove('open')}
  ssOverlay.addEventListener('click',closeSS);
  ssPopup.addEventListener('change',function(e){
    if(e.target.matches('input[name="ssSize"]')){
      addToCart(ssPopup.getAttribute('data-brand'),ssPopup.getAttribute('data-frag'),e.target.value,parseInt(e.target.getAttribute('data-price'),10));
      closeSS();
    }
  });

  function openDrawer(){drawer.classList.add('open');drawerOverlay.classList.add('open')}
  floatBtn.addEventListener('click',openDrawer);
  document.querySelectorAll('[data-open-cart]').forEach(function(btn){btn.addEventListener('click',openDrawer)});
  closeDrawerBtn.addEventListener('click',function(){drawer.classList.remove('open');drawerOverlay.classList.remove('open')});
  drawerOverlay.addEventListener('click',function(){drawer.classList.remove('open');drawerOverlay.classList.remove('open')});

  drawerBody.addEventListener('click',function(e){
    var btn=e.target.closest('[data-action]');
    if(!btn)return;
    var key=btn.getAttribute('data-key');
    var action=btn.getAttribute('data-action');
    if(action==='plus')changeQty(key,1);
    else if(action==='minus')changeQty(key,-1);
    else if(action==='remove')removeItem(key);
  });

  shipPartners.addEventListener('change',function(e){
    if(!e.target.matches('input[name="shipPartner"]'))return;
    if(!PARTNERS[e.target.value])return;
    partnerId=e.target.value;
    try{localStorage.setItem('iram_delivery',partnerId)}catch(err){}
    renderCart();
    if(window.__toast)window.__toast('Delivery partner set to '+partner().name+(surcharge()?' (+'+fmt(surcharge())+')':' \u2014 free shipping'));
  });

  document.addEventListener('click',function(e){
    var cartBtn=e.target.closest('.cart-btn');
    if(!cartBtn||cartBtn.disabled)return;
    var cd=null;
    var fc=cartBtn.closest('.frag-cell');
    if(fc&&fc._cartData){cd=fc._cartData}
    else{var card=cartBtn.closest('.frag-card');if(card&&card._cartData)cd=card._cartData}
    if(cd)showSizeSelector(cd);
  });

  function genOrderText(){
    var lines=['\u{1F31F} IRAM Perfume Order',''];
    var totalQty=0;
    for(var i=0;i<cart.length;i++){
      var it=cart[i];
      totalQty+=it.qty;
      lines.push(it.qty+' \u00D7 '+it.brand+' \u2014 '+it.frag+' ('+it.size+') \u2014 '+fmt(it.price*it.qty));
    }
    lines.push('');
    lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    lines.push('Items: '+totalQty);
    var sub=subtotal(),ship=shipping(sub),tot=sub+ship;
    lines.push('Subtotal: '+fmt(sub));
    lines.push('Delivery partner: '+partner().name+(surcharge()?' (+'+fmt(surcharge())+')':' (free)'));
    lines.push('Shipping: '+(ship===0?'FREE':fmt(ship)));
    lines.push('Grand Total: '+fmt(tot));
    lines.push('');
    lines.push('Name: ');
    lines.push('Address: ');
    lines.push('Phone: ');
    return lines.join('\n');
  }

  copyBtn.addEventListener('click',function(){
    var text=genOrderText();
    if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){copyBtn.textContent='\u2713 Copied!';setTimeout(function(){copyBtn.textContent='Copy Order'},2000)})}
    else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);copyBtn.textContent='\u2713 Copied!';setTimeout(function(){copyBtn.textContent='Copy Order'},2000)}
  });

  whatsappBtn.addEventListener('click',function(){window.open('https://wa.me/919355533509?text='+encodeURIComponent(genOrderText()),'_blank')});

  clearBtn.addEventListener('click',function(){
    if(!cart.length)return;
    cart=[];save();renderCart();
    if(window.__toast)window.__toast('Cart cleared');
  });

  renderCart();
})();}catch(e){console.warn('Cart init failed:',e)}

try{(function(){
  var overlay=document.getElementById('pcOverlay');
  var sheet=document.getElementById('pcProductSheet');
  var body=document.getElementById('pcBody');
  var closeBtn=document.getElementById('pcClose');
  var sizes=['3ml','5ml','7.5ml','10ml','20ml','30ml'];
  var _card=null,selSize=0,selQty=1;
  function setQty(n){
    selQty=Math.max(1,Math.min(99,n||1));
    var el=document.getElementById('pcQtyVal');
    if(el)el.textContent=selQty;
    var m=document.getElementById('pcQtyMinus');
    if(m)m.disabled=selQty<=1;
    var pl=document.getElementById('pcQtyPlus');
    if(pl)pl.disabled=selQty>=99;
  }
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function fmt(n){return n?('\u20B9'+Number(n).toLocaleString('en-IN')):''}
  var chipDefs=[['scent','Scent'],['season','Season'],['occasion','Occasion'],['time','Time'],['weather','Weather'],['mood','Mood'],['family','Family']];
  function current(){var ok=false,pr=0;if(_card&&_card._cartData){for(var i=0;i<sizes.length;i++){if(i===selSize&&_card._cartData.available[i]){ok=true;pr=_card._cartData.prices[i]||0}}}return{ok:ok,price:pr}}
  function sync(){
    var c=current();var addBtn=document.getElementById('pcAddBtn');
    if(addBtn){addBtn.disabled=!c.ok;addBtn.classList.toggle('disabled',!c.ok);addBtn.textContent=c.ok?'Add to Cart':'Unavailable'}
  }
  function open(card){
    _card=card;
    var d=card._cartData;
    if(!d)return;
    var brand=d.brand,frag=d.frag;
    sheet.classList.toggle('pc-sold',!!d.isSoldOut);
    var attrHtml='';
    for(var i=0;i<chipDefs.length;i++){
      var k=chipDefs[i][0],lbl=chipDefs[i][1];
      var v=card.getAttribute('data-'+k);
      if(v){
        var parts=v.split(','),joined=[];
        for(var j=0;j<parts.length;j++)joined.push(esc(parts[j]));
        attrHtml+='<div class="pc-attr-chip"><small>'+lbl+'</small><span>'+joined.join(' / ')+'</span></div>';
      }
    }
    if(!attrHtml&&d.attrs){for(var i=0;i<chipDefs.length;i++){var k=chipDefs[i][0],lbl=chipDefs[i][1];if(d.attrs[k]&&d.attrs[k].length){attrHtml+='<div class="pc-attr-chip"><small>'+lbl+'</small><span>'+d.attrs[k].map(esc).join(' / ')+'</span></div>'}}}
    var img=card.querySelector('.pc-img');
    var hasSrc=img&&img.getAttribute('src');
    var imgHtml='<div class="pc-hero-ph" aria-hidden="true"></div>';
    if(hasSrc)imgHtml='<img src="'+esc(img.getAttribute('src'))+'" alt="'+esc(frag)+'" class="pc-hero-img" loading="lazy">';
    var hero='<div class="pc-hero">'+imgHtml
      +'<div class="pc-hero-title"><span class="pc-hero-brand">'+esc(brand)+'</span><h3 class="pc-hero-name">'+esc(frag)+'</h3>'
      +(d.gender?'<span class="pc-gender pc-gender-'+d.gender.toLowerCase()+'">'+d.gender+'</span>':'')
      +'<a class="pc-rating" href="#reviewsGrid" data-close-sheet><span class="pc-rating-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>5.0</span><small>&middot; verified reviews</small></a>'
      +'</div></div>';
    var firstAvail=null;
    for(var i=0;i<sizes.length;i++)if(d.available[i]){firstAvail=i;break}
    selSize=firstAvail===null?0:firstAvail;
    selQty=1;
    var sizeWrap='<div class="pc-size" role="radiogroup" aria-label="Choose size" id="pcSizeList">';
    for(var i=0;i<sizes.length;i++){
      var ok=!!d.available[i];
      sizeWrap+='<button type="button" role="radio" aria-checked="'+(i===selSize)+'" class="pc-size-opt'+(ok?'':' pc-unavail')+(i===selSize?' sel':'')+'" data-i="'+i+'"'+(ok?'':' disabled')+'>'
        +'<b>'+sizes[i]+'</b><span>'+(d.prices[i]?fmt(d.prices[i]):'')+'</span>'+(ok?'':'<small class="pc-unavail-t">unavailable</small>')
        +'</button>';
    }
    sizeWrap+='</div>';
    var inspTxt=(d.inspired||'').replace(/\s+/g,' ').trim();
    if(inspTxt==='-')inspTxt='';
    var inspHtml=inspTxt?'<p class="pc-inspired-lg"><strong>Reminds me of:</strong> '+esc(inspTxt)+'</p>':'';
    var refsHtml=d.links?'<p class="pc-refs"><strong>References:</strong> '+d.links+'</p>':'';
    var dis=(card.getAttribute('data-division'))?'<div class="pc-attr-chip pc-dis"><small>Division</small><span>'+esc(card.getAttribute('data-division'))+'</span></div>':'';
    body.innerHTML=hero+'<div class="pc-info">'+(dis+attrHtml?'<div class="pc-attr-grid">'+dis+attrHtml+'</div>':'')+inspHtml+refsHtml
      +'<div class="pc-size-label">Choose size</div>'+sizeWrap
      +'<div class="pc-sheet-actions">'
      +'<div class="pc-qty" role="group" aria-label="Quantity">'
      +'<button type="button" class="pc-qty-btn" id="pcQtyMinus" aria-label="Decrease quantity">&#8722;</button>'
      +'<span class="pc-qty-val" id="pcQtyVal" aria-live="polite">1</span>'
      +'<button type="button" class="pc-qty-btn" id="pcQtyPlus" aria-label="Increase quantity">+</button>'
      +'</div>'
      +'<button type="button" class="pc-btn-add" id="pcAddBtn">Add to Cart</button>'
      +'</div>'
      +'<ul class="pc-trust">'
      +'<li>&#10003; 100% authentic, poured from sealed bottles</li>'
      +'<li>&#10003; Free shipping over &#8377;999 across India</li>'
      +'<li>&#10003; Ships in 24&#8211;48 hrs, 3&#8211;7 day delivery</li>'
      +'</ul></div>';
    sync();
    setQty(selQty);
    sheet.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('pc-lock');
    if(closeBtn)closeBtn.focus();
  }
  function close(){
    sheet.classList.remove('open');
    sheet.classList.remove('pc-sold');
    overlay.classList.remove('open');
    document.body.classList.remove('pc-lock');
    _card=null;
  }
  document.addEventListener('click',function(e){
    var jump=e.target.closest('[data-close-sheet]');
    if(jump){close();return}
    var t=e.target.closest('.frag-card [data-open]');
    if(t){e.preventDefault();e.stopPropagation();var card=t.closest('.frag-card');if(card)open(card)}
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' '&&e.key!=='Spacebar')return;
    var t=e.target;
    if(t&&t.getAttribute&&t.getAttribute('role')==='button'&&t.classList.contains('pc-media')){
      e.preventDefault();
      var card=t.closest('.frag-card');
      if(card)open(card);
    }
  });
  body.addEventListener('click',function(e){
    var sizeEl=e.target.closest('.pc-size-opt');
    if(sizeEl&&!sizeEl.disabled){
      selSize=Number(sizeEl.getAttribute('data-i'))||0;
      body.querySelectorAll('.pc-size-opt').forEach(function(b){b.classList.toggle('sel',b===sizeEl);b.setAttribute('aria-checked',b===sizeEl?'true':'false')});
      sync();
      return;
    }
    var addBtn=e.target.closest('#pcAddBtn');
    if(addBtn&&!addBtn.disabled){
      var c=current();
      if(c.ok&&window.__iramAddToCart)window.__iramAddToCart(_card._cartData.brand,_card._cartData.frag,sizes[selSize],c.price,selQty);
      close();
      return;
    }
    var qm=e.target.closest('#pcQtyMinus');
    if(qm){setQty(selQty-1);return}
    var qp=e.target.closest('#pcQtyPlus');
    if(qp){setQty(selQty+1);return}
  });
  if(closeBtn)closeBtn.addEventListener('click',close);
  if(overlay)overlay.addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sheet.classList.contains('open'))close()});
})();}catch(e){console.warn('Product sheet init failed:',e)}

try{(function(){
  var sizes=['3ml','5ml','7.5ml','10ml','20ml','30ml'];
  var prods=window._products||{};
  var keys=Object.keys(prods);
  var fcCount=0,cardCount=0,issues=0;
  document.querySelectorAll('.frag-cell[data-pid]').forEach(function(fc){
    fcCount++;
    var d=fc._cartData;
    if(!d){issues++;console.warn('[Cart] frag-cell has data-pid but no _cartData:',fc.getAttribute('data-pid'));return}
    if(!d.prices||!d.prices.length){issues++;console.warn('[Cart] no prices for',d.brand,d.frag);return}
    if(d.prices.length!==6){issues++;console.warn('[Cart] expected 6 prices, got',d.prices.length,'for',d.brand,d.frag)}
    var hasAvail=d.available.some(function(a){return a});
    if(!hasAvail&&!d.isSoldOut&&!d.isComingSoon){issues++;console.warn('[Cart] all sizes unavailable but not marked for',d.brand,d.frag)}
  });
  document.querySelectorAll('.frag-card[data-pid]').forEach(function(card){
    cardCount++;
    if(!card._cartData){issues++;console.warn('[Cart] frag-card has data-pid but no _cartData:',card.getAttribute('data-pid'))}
  });
  if(issues===0){console.log('[Cart] All',keys.length,'products validated. Desktop:',fcCount,'Mobile:',cardCount)}
  else{console.warn('[Cart]',issues,'issues found across',keys.length,'products')}
})();}catch(e){}

try{(function(){
  var root=document.documentElement;
  var btn=document.getElementById('themeToggle');
  var toggles=document.querySelectorAll('#themeToggle,[data-theme-toggle]');
  var stored=null;try{stored=localStorage.getItem('theme')}catch(e){}
  var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;
  function setIcon(dark){if(btn)btn.innerHTML=dark?'&#9788;':'&#9789;';toggles.forEach(function(t){if(t!==btn)t.textContent=dark?'Use light mode':'Use dark mode'})}
  if(stored==='dark'||(!stored&&prefersDark)){root.setAttribute('data-theme','dark');setIcon(true)}
  toggles.forEach(function(toggle){toggle.addEventListener('click',function(){
    var isDark=root.getAttribute('data-theme')==='dark';
    if(isDark){root.removeAttribute('data-theme');try{localStorage.setItem('theme','light')}catch(e){}setIcon(false)}
    else{root.setAttribute('data-theme','dark');try{localStorage.setItem('theme','dark')}catch(e){}setIcon(true)}
  })})
})();}catch(e){console.warn('Theme toggle init failed:',e)}

try{(function(){
  var index=[];
  function productSlug(brand,name){return(brand+'-'+name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  var cardsMap={};
  document.querySelectorAll('.frag-card').forEach(function(card){
    var bn=card.querySelector('.card-brand-name');
    var fn=card.querySelector('.card-frag-name');
    if(bn&&fn)cardsMap[bn.textContent.trim().toLowerCase()+'|'+fn.textContent.trim().toLowerCase()]=card;
  });
  document.querySelectorAll('.frag-table').forEach(function(table){
    var curBrand='';
    table.querySelectorAll('tbody tr').forEach(function(row){
      var bc=row.querySelector('.brand-cell');
      if(bc)curBrand=bc.textContent.trim();
      var fc=row.querySelector('.frag-cell');
      if(!fc)return;
      var nameA=fc.querySelector('a');
      var fragName=nameA?nameA.textContent.replace(/\s+/g,' ').trim():'';
      var slug=nameA?nameA.getAttribute('href').replace(/^fragrance\//,'').replace(/\.html$/,''):productSlug(curBrand,fragName);
      var inspired=fc.parentElement?fc.parentElement.querySelector('.inspired-cell'):null;
      var inspiredText=inspired?inspired.textContent.trim():'';
      var tags=[];
      fc.querySelectorAll('.tag').forEach(function(t){tags.push(t.textContent.trim())});
      var attrs={};
      ['scent','season','occasion','time','weather','mood','family'].forEach(function(a){
        var v=fc.getAttribute('data-'+a);
        if(v)attrs[a]=v;
      });
      row.setAttribute('data-product',slug);
      var card=cardsMap[curBrand.toLowerCase()+'|'+fragName.toLowerCase()];
      if(card)card.setAttribute('data-product',slug);
      index.push({
        brand:curBrand,
        frag:fragName,
        inspired:inspiredText,
        tags:tags.join(' '),
        attrs:attrs,
        el:row,
        fragEl:fc,
        product:slug
      });
    });
  });

  function buildText(item){
    var parts=[item.brand,item.frag,item.inspired,item.tags];
    ['scent','season','occasion','time','weather','mood','family'].forEach(function(k){
      if(item.attrs[k])parts.push(item.attrs[k].replace(/,/g,' '));
    });
    return parts.join(' ').toLowerCase();
  }

  function highlight(text,query){
    if(!query)return escHtml(text);
    var re=new RegExp('('+escRegex(query)+')','gi');
    return escHtml(text).replace(re,'<mark class="highlight">$1</mark>');
  }

  function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function escRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

  function lev(a,b){
    if(a===b)return 0;
    var m=a.length,n=b.length;
    if(!m)return n;
    if(!n)return m;
    var prev=new Array(n+1),cur=new Array(n+1),i,j;
    for(j=0;j<=n;j++)prev[j]=j;
    for(i=1;i<=m;i++){
      cur[0]=i;
      for(j=1;j<=n;j++){
        cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1));
      }
      for(j=0;j<=n;j++)prev[j]=cur[j];
    }
    return prev[n];
  }
  function subseq(needle,hay){
    var i=0;
    for(var j=0;j<hay.length&&i<needle.length;j++){if(hay[j]===needle[i])i++}
    return i===needle.length;
  }
  function fuzzy(term,hay){
    if(!term)return true;
    if(hay.indexOf(term)>-1)return true;
    if(term.length<3)return false;
    if(subseq(term,hay))return true;
    var words=hay.split(/[^a-z0-9]+/);
    var tol=term.length<=4?1:term.length<=7?2:3;
    for(var i=0;i<words.length;i++){
      var w=words[i];
      if(!w)continue;
      if(Math.abs(w.length-term.length)>tol)continue;
      if(lev(term,w)<=tol)return true;
    }
    return false;
  }

  function search(query,q){
    if(!q)return[];
    var exact=[],fuzzyHits=[];
    var terms=q.split(/\s+/).filter(Boolean);
    for(var i=0;i<index.length;i++){
      var item=index[i];
      var haystack=buildText(item);
      var allExact=true,allFuzzy=true;
      for(var t=0;t<terms.length;t++){
        var term=terms[t];
        if(!term)continue;
        if(haystack.indexOf(term)===-1)allExact=false;
        if(!fuzzy(term,haystack))allFuzzy=false;
        if(!allExact&&!allFuzzy)break;
      }
      if(allExact)exact.push(item);
      else if(allFuzzy)fuzzyHits.push(item);
    }
    return exact.concat(fuzzyHits);
  }

  var RECENT_KEY='iram_recent_searches';
  function recent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]').filter(Boolean).slice(0,6)}catch(e){return[]}}
  function pushRecent(q){
    q=(q||'').trim();
    if(q.length<2)return;
    var list=recent().filter(function(x){return x.toLowerCase()!==q.toLowerCase()});
    list.unshift(q);
    try{localStorage.setItem(RECENT_KEY,JSON.stringify(list.slice(0,6)))}catch(e){}
  }
  function clearRecent(){try{localStorage.removeItem(RECENT_KEY)}catch(e){}}
  function renderRecent(container){
    var list=recent();
    container.innerHTML='';
    if(!list.length){container.classList.remove('open');return}
    var wrap=document.createElement('div');
    wrap.className='srch-recent';
    var head=document.createElement('div');
    head.className='srch-recent-head';
    head.innerHTML='<span>Recent searches</span>';
    var clr=document.createElement('button');
    clr.type='button';
    clr.textContent='Clear';
    clr.addEventListener('click',function(){clearRecent();container.innerHTML='';container.classList.remove('open')});
    head.appendChild(clr);
    wrap.appendChild(head);
    list.forEach(function(q){
      var chip=document.createElement('button');
      chip.type='button';
      chip.className='srch-chip';
      chip.textContent=q;
      wrap.appendChild(chip);
    });
    container.appendChild(wrap);
    container.classList.add('open');
  }
  function wireRecent(container,inputEl,clearEl){
    container.addEventListener('click',function(e){
      var chip=e.target.closest('.srch-chip');
      if(!chip)return;
      inputEl.value=chip.textContent;
      if(clearEl)clearEl.classList.add('visible');
      doSearch(inputEl,container);
    });
    return function(){
      if(inputEl.value.trim()){container.innerHTML='';container.classList.remove('open')}
      else renderRecent(container);
    };
  }

  function renderResults(container,results,query,inputEl){
    container.innerHTML='';
    if(!results.length){
      container.innerHTML='<div class="search-no-results">No fragrances found</div>';
      container.classList.add('open');
      return;
    }
    var shown=Math.min(results.length,40);
    for(var i=0;i<shown;i++){
      var item=results[i];
      var div=document.createElement('div');
      div.className='search-result-item';
      div.setAttribute('data-product',item.product);
      var genderTag='';
      item.fragEl.querySelectorAll('.tag').forEach(function(t){
        if(t.classList.contains('tag-men')||t.classList.contains('tag-unisex')||t.classList.contains('tag-women')){
          genderTag='<span class="'+t.className+'">'+t.textContent+'</span>';
        }
      });
      div.innerHTML='<span class="search-result-brand">'+highlight(item.brand,query)+'</span>'
        +'<span class="search-result-name">'+highlight(item.frag,query)+(genderTag?' '+genderTag:'')+'</span>'
        +'<span class="search-result-meta">'+highlight(item.inspired,query)+'</span>';
      container.appendChild(div);
    }
    if(results.length>40){
      var more=document.createElement('div');
      more.className='search-no-results';
      more.textContent='+'+(results.length-40)+' more results';
      container.appendChild(more);
    }
    container.classList.add('open');
  }

  function doSearch(inputEl,resultsEl){
    var q=inputEl.value.trim().toLowerCase();
    var clearBtn=inputEl.parentElement.querySelector('.search-clear');
    if(clearBtn)clearBtn.classList.toggle('visible',inputEl.value.length>0);
    if(!q){resultsEl.classList.remove('open');resultsEl.innerHTML='';return}
    var results=search(null,q);
    renderResults(resultsEl,results,q,inputEl);
  }

  function navigateToProduct(productId){
    if(!productId)return;
    var candidates=document.querySelectorAll('[data-product="'+productId+'"]');
    var target=null;
    for(var i=0;i<candidates.length;i++){
      if(candidates[i].offsetHeight>0){target=candidates[i];break}
    }
    if(!target)return;
    var rect=target.getBoundingClientRect();
    var scrollTop=window.pageYOffset||document.documentElement.scrollTop;
    window.scrollTo({top:scrollTop+rect.top-80,behavior:'smooth'});
    var highlightEl=target.classList.contains('frag-card')?target.querySelector('.card-body')||target:target;
    highlightEl.style.transition='background .3s';
    highlightEl.style.background=getComputedStyle(document.documentElement).getPropertyValue('--highlight-bg')||'#FFF5CC';
    setTimeout(function(){highlightEl.style.background=''},2000);
  }

  function setupDesktop(){
    var input=document.getElementById('searchInput');
    var results=document.getElementById('searchResults');
    var clear=document.getElementById('searchClear');
    if(!input||!results||!clear)return;
    var showRecent=wireRecent(results,input,clear);
    input.addEventListener('input',function(){doSearch(input,results)});
    input.addEventListener('focus',function(){if(input.value.trim())doSearch(input,results);else showRecent()});
    clear.addEventListener('click',function(){input.value='';results.classList.remove('open');clear.classList.remove('visible');input.focus();showRecent()});
    results.addEventListener('click',function(e){
      var item=e.target.closest('.search-result-item');
      if(!item)return;
      var productId=item.getAttribute('data-product');
      pushRecent(input.value);
      results.classList.remove('open');
      input.value='';
      clear.classList.remove('visible');
      navigateToProduct(productId);
    });
    document.addEventListener('click',function(e){
      if(!e.target.closest('.search-wrap'))results.classList.remove('open');
    });
    document.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='k'){
        e.preventDefault();
        input.focus();
        input.select();
      }
      if(e.key==='Escape'){
        results.classList.remove('open');
        input.blur();
      }
    });
  }

  function setupMobile(){
    var btns=document.querySelectorAll('[data-mobile-search]');
    var overlay=document.getElementById('mobileSearchOverlay');
    var input=document.getElementById('mobileSearchInput');
    var results=document.getElementById('mobileSearchResults');
    var clear=document.getElementById('mobileSearchClear');
    if(!btns.length||!overlay||!input||!results||!clear)return;
    var showRecent=wireRecent(results,input,clear);
    function closeOverlay(){overlay.classList.remove('open');results.classList.remove('open');document.body.style.overflow=''}
    function pickResult(el){
      var item=el.closest?el.closest('.search-result-item'):null;
      if(!item)return;
      var productId=item.getAttribute('data-product');
      pushRecent(input.value);
      closeOverlay();
      navigateToProduct(productId);
    }
    btns.forEach(function(btn){btn.addEventListener('click',function(){
      overlay.classList.add('open');
      document.body.style.overflow='hidden';
      setTimeout(function(){input.focus();if(input.value.trim())doSearch(input,results);else showRecent()},100);
    })});
    overlay.addEventListener('click',function(e){
      if(e.target===overlay)closeOverlay();
    });
    input.addEventListener('input',function(){doSearch(input,results)});
    input.addEventListener('focus',function(){if(input.value.trim())doSearch(input,results);else showRecent()});
    clear.addEventListener('click',function(){input.value='';results.classList.remove('open');clear.classList.remove('visible');input.focus();showRecent()});
    results.addEventListener('click',function(e){pickResult(e.target)});
  }

  setupDesktop();
  setupMobile();
})();}catch(e){console.warn('Search init failed:',e)}

try{(function(){
  var btn=document.getElementById('mobileMenuBtn'),menu=document.getElementById('mobileMenu');
  if(!btn||!menu)return;
  function close(){menu.classList.remove('open');menu.setAttribute('aria-hidden','true');btn.setAttribute('aria-expanded','false')}
  btn.addEventListener('click',function(){var opening=!menu.classList.contains('open');menu.classList.toggle('open',opening);menu.setAttribute('aria-hidden',opening?'false':'true');btn.setAttribute('aria-expanded',opening?'true':'false')});
  menu.addEventListener('click',function(e){if(e.target===menu||e.target.closest('[data-mobile-menu-link]'))close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();}catch(e){console.warn('Mobile menu init failed:',e)}

try{(function(){
  var nav=document.getElementById('mobileNav');
  if(!nav)return;
  var navItems=nav.querySelectorAll('.nav-item');
  function setActive(item){navItems.forEach(function(n){var on=n===item;n.classList.toggle('active',on);if(on)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')})}
  function openBrands(){
    var bb=document.getElementById('pcBrandBtn');
    if(bb){bb.click();return}
    scrollTo('#brandSection');
  }
  function openWishlist(){if(window.__openWishlist){window.__openWishlist();return}var first=document.querySelector('.pc-wish.active');if(first)first.closest('.frag-card').scrollIntoView({behavior:'smooth',block:'center'})}
  function openCompare(){if(window.__openCompare){window.__openCompare();return}}
  function scrollTo(sel,block){var el=document.querySelector(sel);if(el)el.scrollIntoView({behavior:'smooth',block:block||'start'})}
  navItems.forEach(function(item){item.addEventListener('click',function(e){
    var id=item.id;
    if(id==='navHome'){e.preventDefault();setActive(item);window.scrollTo({top:0,behavior:'smooth'});return}
    if(id==='navBrands'){e.preventDefault();setActive(item);openBrands();return}
    if(id==='navCompare'){e.preventDefault();setActive(item);openCompare();return}
    if(id==='navWishlist'){e.preventDefault();setActive(item);openWishlist();return}
    if(item.getAttribute('target')==='_blank')return;
    if(item.getAttribute('href')==='#'){e.preventDefault();setActive(item)}
  })});
  window.__setNavActive=function(id){var t=document.getElementById(id);if(t)setActive(t)};
  var lastY=0,ticking=false;
  window.addEventListener('scroll',function(){
    if(!ticking){
      window.requestAnimationFrame(function(){
        var y=window.pageYOffset;
        if(y>lastY&&y>60&&window.innerWidth<=768){nav.classList.add('hidden')}
        else{nav.classList.remove('hidden')}
        lastY=y;ticking=false;
      });
      ticking=true;
    }
  },{passive:true});
})();}catch(e){console.warn('Mobile nav init failed:',e)}

try{(function(){
  function parsePrice(s){
    if(!s)return null;
    var t=s.replace(/<[^>]+>/g,'').replace(/[^\d]/g,'');
    return t?parseInt(t,10):null;
  }
  function set(id,val){var el=document.getElementById(id);if(el)el.textContent=val}
  function computeStats(){
    var allFc=document.querySelectorAll('.frag-cell');
    var totalFragrances=allFc.length;
    var brands=new Set();
    var designerCount=0,meCount=0;
    var menCount=0,womenCount=0,unisexCount=0;
    var freshCount=0,woodyCount=0,sweetCount=0;
    var comingSoon=0;
    var prices={3:[],5:[],7:[],10:[],20:[],30:[]};
    var cheapest={price:Infinity,name:'',brand:''};
    var expensive={price:0,name:'',brand:''};
    var sizeKeys=['3','5','7','10','20','30'];
    document.querySelectorAll('.frag-table').forEach(function(table){
      var section=table.closest('.table-wrap');
      var heading=section?section.previousElementSibling:null;
      var isDesigner=heading&&heading.textContent.trim()==='Designer';
      table.querySelectorAll('tbody tr').forEach(function(row){
        var bc=row.querySelector('.brand-cell');
        if(bc)brands.add(bc.textContent.trim());
        var fc=row.querySelector('.frag-cell');
        if(!fc)return;
        if(isDesigner)designerCount++;else meCount++;
        if(fc.querySelector('.tag-men'))menCount++;
        else if(fc.querySelector('.tag-women'))womenCount++;
        else if(fc.querySelector('.tag-unisex'))unisexCount++;
        var scent=(fc.getAttribute('data-scent')||'').toLowerCase();
        var family=(fc.getAttribute('data-family')||'').toLowerCase();
        var combined=scent+','+family;
        if(combined.indexOf('fresh')!==-1||combined.indexOf('aquatic')!==-1||combined.indexOf('citrus')!==-1)freshCount++;
        if(combined.indexOf('woody')!==-1||combined.indexOf('amber')!==-1)woodyCount++;
        if(combined.indexOf('sweet')!==-1||combined.indexOf('vanilla')!==-1||combined.indexOf('gourmand')!==-1)sweetCount++;
        if(fc.textContent.indexOf('COMING SOON')!==-1)comingSoon++;
        var cells=row.querySelectorAll('.size-cell');
        cells.forEach(function(c,i){
          if(i<sizeKeys.length){
            var p=parsePrice(c.textContent);
            if(p!==null)prices[sizeKeys[i]].push(p);
          }
        });
        var fragName='';
        fc.childNodes.forEach(function(n){if(n.nodeType===3)fragName+=n.textContent});
        fragName=fragName.trim();
        var brandName=bc?bc.textContent.trim():'';
        var p30=parsePrice(cells[5]?cells[5].textContent:'');
        if(p30!==null&&p30<cheapest.price){cheapest={price:p30,name:fragName,brand:brandName}}
        if(p30!==null&&p30>expensive.price){expensive={price:p30,name:fragName,brand:brandName}}
      });
    });
    function avg(arr){if(!arr.length)return 0;return Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length)}
    function fmt(n){return n===Infinity||n===0?'—':'₹'+n.toLocaleString('en-IN')}
    set('statTotal',totalFragrances);
    set('statBrands',brands.size);
    set('statDesigner',designerCount);
    set('statMiddleEastern',meCount);
    set('statMen',menCount);
    set('statWomen',womenCount);
    set('statUnisex',unisexCount);
    set('statComingSoon',comingSoon);
    set('statCheapest',cheapest.price===Infinity?'—':fmt(cheapest.price)+' ('+cheapest.brand+' '+cheapest.name+')');
    set('statExpensive',expensive.price===0?'—':fmt(expensive.price)+' ('+expensive.brand+' '+expensive.name+')');
    set('statAvg3ml',fmt(avg(prices['3'])));
    set('statAvg5ml',fmt(avg(prices['5'])));
    set('statAvg7ml',fmt(avg(prices['7'])));
    set('statAvg10ml',fmt(avg(prices['10'])));
    set('statAvg20ml',fmt(avg(prices['20'])));
    set('statAvg30ml',fmt(avg(prices['30'])));
    set('statFresh',freshCount);
    set('statWoody',woodyCount);
    set('statSweet',sweetCount);
  }
  computeStats();
})();}catch(e){console.warn('Stats init failed:',e)}

try{(function(){
  if(window.innerWidth>768)return;
  var brandData=[];
  var seen={};
  var designerBrands={};
  document.querySelectorAll('.table-wrap').forEach(function(tw){
    var heading=tw.previousElementSibling;
    var division=heading?heading.textContent.trim():'';
    tw.querySelectorAll('.brand-cell').forEach(function(bc){
      var name=bc.textContent.trim();
      if(name)designerBrands[name]=division;
    });
  });
  document.querySelectorAll('.brand-cell').forEach(function(bc){
    var name=bc.textContent.trim();
    if(!name||seen[name])return;
    seen[name]=true;
    var img=bc.querySelector('img');
    var logo=img?img.getAttribute('src'):'';
    var row=bc.closest('tr');
    brandData.push({name:name,logo:logo,row:row});
  });
  if(!brandData.length)return;
  var track=document.createElement('div');
  track.className='brand-capsule-track';
  document.body.appendChild(track);
  var capsule=document.createElement('div');
  capsule.className='brand-capsule';
  capsule.setAttribute('role','button');
  capsule.setAttribute('tabindex','0');
  capsule.setAttribute('aria-label','Brand navigator');
  var progressEl=document.createElement('div');
  progressEl.className='brand-capsule-progress';
  var logoEl=document.createElement('img');
  logoEl.className='brand-capsule-logo';
  logoEl.alt='';
  var fallbackEl=document.createElement('div');
  fallbackEl.className='brand-capsule-fallback';
  var nameEl=document.createElement('span');
  nameEl.className='brand-capsule-name';
  capsule.appendChild(progressEl);
  capsule.appendChild(logoEl);
  capsule.appendChild(fallbackEl);
  capsule.appendChild(nameEl);
  document.body.appendChild(capsule);
  var previewEl=document.createElement('div');
  previewEl.className='brand-capsule-preview';
  document.body.appendChild(previewEl);
  var menu=document.createElement('div');
  menu.className='brand-capsule-menu';
  menu.setAttribute('role','menu');
  brandData.forEach(function(b){
    var item=document.createElement('div');
    item.className='brand-capsule-menu-item';
    item.setAttribute('data-brand',b.name);
    item.setAttribute('role','menuitem');
    item.setAttribute('tabindex','0');
    item.setAttribute('aria-label',b.name+(designerBrands[b.name]?' - '+designerBrands[b.name]:''));
    if(b.logo){
      var img=document.createElement('img');
      img.src=b.logo;
      img.alt='';
      item.appendChild(img);
    }else{
      var fb=document.createElement('div');
      fb.className='brand-capsule-menu-fallback';
      fb.textContent=b.name.charAt(0);
      item.appendChild(fb);
    }
    var span=document.createElement('span');
    span.textContent=b.name;
    item.appendChild(span);
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  var backdrop=document.createElement('div');
  backdrop.className='brand-capsule-backdrop';
  document.body.appendChild(backdrop);
  var tooltipEl=document.createElement('div');
  tooltipEl.className='brand-capsule-tooltip';
  document.body.appendChild(tooltipEl);
  var currentBrand=null;
  var menuOpen=false;
  var peeked=false;
  var scrollDist=0;
  var morphing=false;
  function haptic(el){
    el.classList.remove('haptic');
    void el.offsetWidth;
    el.classList.add('haptic');
    setTimeout(function(){el.classList.remove('haptic')},350);
  }
  function getBrandData(brand){
    for(var i=0;i<brandData.length;i++){
      if(brandData[i].name===brand)return brandData[i];
    }
    return null;
  }
  function setLogo(brand,data){
    if(data.logo){
      logoEl.src=data.logo;
      logoEl.style.display='';
      fallbackEl.style.display='none';
    }else{
      logoEl.style.display='none';
      fallbackEl.style.display='flex';
      fallbackEl.textContent=brand.charAt(0);
    }
  }
  function updateCapsule(brand,animate){
    if(brand===currentBrand)return;
    var data=getBrandData(brand);
    if(!data)return;
    var prev=currentBrand;
    currentBrand=brand;
    if(animate&&!morphing&&prev){
      morphing=true;
      capsule.classList.add('brand-capsule-morph-out');
      setTimeout(function(){
        setLogo(brand,data);
        nameEl.textContent=brand;
        capsule.classList.remove('brand-capsule-morph-out');
        capsule.classList.add('brand-capsule-morph-in');
        void capsule.offsetWidth;
        requestAnimationFrame(function(){
          capsule.classList.remove('brand-capsule-morph-in');
          morphing=false;
        });
      },250);
    }else{
      setLogo(brand,data);
      nameEl.textContent=brand;
    }
    menu.querySelectorAll('.brand-capsule-menu-item').forEach(function(item){
      item.classList.toggle('active',item.getAttribute('data-brand')===brand);
    });
  }
  function updateProgress(){
    var idx=-1;
    for(var i=0;i<brandData.length;i++){
      if(brandData[i].name===currentBrand){idx=i;break}
    }
    if(idx<0)return;
    var pct=brandNames.length>1?(idx/(brandNames.length-1)):0;
    progressEl.style.transform='scaleY('+(pct||0.02)+')';
  }
  function updateThumbPosition(){
    var scrollTop=window.pageYOffset||document.documentElement.scrollTop;
    var docHeight=document.documentElement.scrollHeight-window.innerHeight;
    var pct=docHeight>0?scrollTop/docHeight:0;
    pct=Math.max(0,Math.min(1,pct));
    capsule.style.top='calc(50% - 70px + '+(pct*112)+'px)';
  }
  function showPreview(brand){
    var div=designerBrands[brand];
    if(!div){previewEl.classList.remove('visible');return}
    previewEl.textContent=div;
    previewEl.classList.add('visible');
  }
  function hidePreview(){previewEl.classList.remove('visible')}
  function scrollToBrand(brand,smooth){
    for(var i=0;i<brandData.length;i++){
      if(brandData[i].name===brand&&brandData[i].row&&brandData[i].row.offsetHeight>0){
        highlightEl(brandData[i].row);
        brandData[i].row.scrollIntoView({behavior:smooth!==false?'smooth':'instant',block:'start'});
        return;
      }
    }
    var cards=document.querySelectorAll('.frag-card');
    for(var i=0;i<cards.length;i++){
      var bn=cards[i].querySelector('.card-brand-name');
      if(bn&&bn.textContent.trim()===brand){
        highlightEl(cards[i]);
        cards[i].scrollIntoView({behavior:smooth!==false?'smooth':'instant',block:'start'});
        return;
      }
    }
  }
  function highlightEl(el){
    el.style.outline='2px solid var(--accent-primary)';
    el.style.outlineOffset='-2px';
    el.style.transition='outline .3s';
    setTimeout(function(){
      el.style.outline='none';
      setTimeout(function(){el.style.transition=''},300);
    },1200);
  }
  function openMenu(){
    if(menuOpen)return;
    menuOpen=true;
    menu.classList.add('open');
    backdrop.classList.add('open');
    showPreview(currentBrand);
  }
  function closeMenu(){
    if(!menuOpen)return;
    menuOpen=false;
    menu.classList.remove('open');
    backdrop.classList.remove('open');
    hidePreview();
  }
  var dragStartY=0;
  var dragMoved=false;
  var dragging=false;
  var dragRaf=null;
  function onDragMove(clientY){
    if(!dragging)return;
    if(Math.abs(clientY-dragStartY)>5)dragMoved=true;
    var trackRect=track.getBoundingClientRect();
    var trackHeight=trackRect.height;
    if(trackHeight<=0)return;
    var progress=(clientY-trackRect.top)/trackHeight;
    progress=Math.max(0,Math.min(1,progress));
    var docHeight=document.documentElement.scrollHeight-window.innerHeight;
    if(docHeight<=0)return;
    window.scrollTo({top:progress*docHeight,behavior:'instant'});
    updateThumbPosition();
    showTooltip();
  }
  function snapToNearestBrand(){
    var closest=null;
    var closestDist=Infinity;
    brandData.forEach(function(b){
      if(b.row&&b.row.offsetHeight>0){
        var rect=b.row.getBoundingClientRect();
        var dist=Math.abs(rect.top-window.innerHeight*0.3);
        if(dist<closestDist){closestDist=dist;closest=b}
      }
    });
    if(closest&&closestDist<80){
      closest.row.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  function showTooltip(){
    if(!currentBrand)return;
    tooltipEl.textContent=currentBrand;
    var capsuleRect=capsule.getBoundingClientRect();
    tooltipEl.style.top=(capsuleRect.top+capsuleRect.height/2)+'px';
    tooltipEl.classList.add('visible');
  }
  function hideTooltip(){tooltipEl.classList.remove('visible')}
  capsule.addEventListener('touchstart',function(e){
    dragging=true;
    dragMoved=false;
    dragStartY=e.touches[0].clientY;
    haptic(capsule);
    e.preventDefault();
  },{passive:false});
  capsule.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(dragRaf)cancelAnimationFrame(dragRaf);
    var touchY=e.touches[0].clientY;
    dragRaf=requestAnimationFrame(function(){
      onDragMove(touchY);
    });
  },{passive:false});
  capsule.addEventListener('touchend',function(){
    dragging=false;
    if(dragRaf){cancelAnimationFrame(dragRaf);dragRaf=null}
    hideTooltip();
    if(!dragMoved){
      openMenu();
    }
    snapToNearestBrand();
  });
  capsule.addEventListener('click',function(e){
    e.stopPropagation();
    if(menuOpen){closeMenu();return}
    openMenu();
  });
  capsule.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      if(menuOpen){closeMenu();return}
      openMenu();
    }
    if(e.key==='Escape'&&menuOpen)closeMenu();
  });
  backdrop.addEventListener('click',closeMenu);
  menu.querySelectorAll('.brand-capsule-menu-item').forEach(function(item){
    item.addEventListener('click',function(e){
      e.stopPropagation();
      var brand=item.getAttribute('data-brand');
      closeMenu();
      updateCapsule(brand,true);
      haptic(capsule);
      scrollToBrand(brand);
    });
    item.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        var brand=item.getAttribute('data-brand');
        closeMenu();
        updateCapsule(brand,true);
        haptic(capsule);
        scrollToBrand(brand);
      }
    });
    item.addEventListener('mouseenter',function(){
      showPreview(item.getAttribute('data-brand'));
    });
    item.addEventListener('touchstart',function(){
      showPreview(item.getAttribute('data-brand'));
    },{passive:true});
  });
  var brandVisible={};
  var brandNames=brandData.map(function(b){return b.name});
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var brand=entry.target.getAttribute('data-brand');
      if(brand)brandVisible[brand]=entry.isIntersecting;
    });
    var active=null;
    for(var i=0;i<brandNames.length;i++){
      if(brandVisible[brandNames[i]]){active=brandNames[i];break}
    }
    if(active){
      var changed=active!==currentBrand;
      updateCapsule(active,changed);
      updateProgress();
      updateThumbPosition();
      if(changed)haptic(capsule);
    }
  },{rootMargin:'-15% 0px -75% 0px',threshold:0});
  brandData.forEach(function(b){
    if(b.row){
      b.row.setAttribute('data-brand',b.name);
      observer.observe(b.row);
    }
  });
  var cards=document.querySelectorAll('.frag-card');
  var seenCards={};
  cards.forEach(function(card){
    var bn=card.querySelector('.card-brand-name');
    if(!bn)return;
    var brand=bn.textContent.trim();
    if(seenCards[brand])return;
    seenCards[brand]=true;
    card.setAttribute('data-brand',brand);
    observer.observe(card);
  });
  var thumbRaf=null;
  window.addEventListener('scroll',function(){
    var y=window.pageYOffset;
    scrollDist+=Math.abs((window._lastScrollY||0)-y);
    window._lastScrollY=y;
    if(!peeked&&scrollDist>300){
      peeked=true;
      capsule.classList.add('peek');
      setTimeout(function(){capsule.classList.remove('peek')},600);
    }
    if(!thumbRaf){
      thumbRaf=requestAnimationFrame(function(){
        updateThumbPosition();
        thumbRaf=null;
      });
    }
  },{passive:true});
  window._lastScrollY=window.pageYOffset;
  updateCapsule(brandNames[0],false);
  updateProgress();
  updateThumbPosition();
})();}catch(e){console.warn('Brand capsule init failed:',e)}
(function(){
  var items=document.querySelectorAll('.review-item');
  var lightbox=document.getElementById('reviewLightbox');
  var lbImg=document.getElementById('lightboxImg');
  var lbClose=document.getElementById('lightboxClose');
  var lbPrev=document.getElementById('lightboxPrev');
  var lbNext=document.getElementById('lightboxNext');
  var idx=0;
  var imgs=[];
  var tx=0;
  var ty=0;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var img=e.target.querySelector('img');
        if(img&&img.dataset.src){img.src=img.dataset.src;img.removeAttribute('data-src')}
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  },{rootMargin:'100px'});
  items.forEach(function(item){io.observe(item);imgs.push(item.querySelector('img'))});
  function open(i){idx=i;lbImg.src=imgs[idx].src;lightbox.classList.add('open');document.body.style.overflow='hidden'}
  function close(){lightbox.classList.remove('open');document.body.style.overflow='';lbImg.src=''}
  function prev(){idx=(idx-1+imgs.length)%imgs.length;lbImg.src=imgs[idx].src}
  function next(){idx=(idx+1)%imgs.length;lbImg.src=imgs[idx].src}
  items.forEach(function(item,i){item.addEventListener('click',function(){open(i)})});
  lbClose.addEventListener('click',close);
  lbPrev.addEventListener('click',prev);
  lbNext.addEventListener('click',next);
  lightbox.addEventListener('click',function(e){if(e.target===lightbox)close()});
  document.addEventListener('keydown',function(e){
    if(!lightbox.classList.contains('open'))return;
    if(e.key==='Escape')close();
    if(e.key==='ArrowLeft')prev();
    if(e.key==='ArrowRight')next();
  });
  lightbox.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
  lightbox.addEventListener('touchend',function(e){
    var dx=e.changedTouches[0].clientX-tx;
    var dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>50){dx<0?next():prev()}
  },{passive:true});
})();

(function(){
  var WEEK=window.IRAM_NEW_DAYS_MS||7*86400000;
  function expireNew(){
    var cutoff=Date.now()-WEEK;
    document.querySelectorAll('.frag-cell[data-added]').forEach(function(fc){
      var d=new Date(fc.getAttribute('data-added')+'T00:00:00');
      if(!isNaN(d)&&d.getTime()<cutoff){
        fc.querySelectorAll('.tag').forEach(function(t){
          if(t.textContent.trim()==='NEW')t.remove();
        });
      }
    });
  }
  expireNew();
})();

try{(function(){
  var track=document.getElementById('heroTrack');
  if(!track)return;
  var slides=Array.prototype.slice.call(track.querySelectorAll('.hero-slide'));
  if(slides.length<2)return;
  var dots=Array.prototype.slice.call(document.querySelectorAll('#heroDots .hero-dot'));
  var hero=track.parentElement;
  var idx=0,timer=null,delay=5000;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function go(n,announce){
    idx=(n+slides.length)%slides.length;
    track.style.transform='translateX('+(-idx*100)+'%)';
    slides.forEach(function(s,i){s.setAttribute('aria-hidden',i===idx?'false':'true');s.inert=i!==idx});
    dots.forEach(function(d,i){
      d.classList.toggle('active',i===idx);
      d.setAttribute('aria-selected',i===idx?'true':'false');
      d.setAttribute('tabindex',i===idx?'0':'-1');
    });
    if(announce)stop();
  }
  function start(){
    if(reduce||document.hidden)return;
    stop();
    timer=setInterval(function(){go(idx+1,false)},delay);
  }
  function stop(){if(timer){clearInterval(timer);timer=null}}
  dots.forEach(function(d,i){d.addEventListener('click',function(){go(i,true);start()})});
  if(hero){
    hero.addEventListener('mouseenter',stop);
    hero.addEventListener('mouseleave',start);
    hero.addEventListener('focusin',stop);
    hero.addEventListener('focusout',start);
    var sx=0,sy=0,armed=false;
    hero.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;armed=true},{passive:true});
    hero.addEventListener('touchmove',function(e){
      if(!armed)return;
      var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
      if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>10){stop();armed='swipe'}
      else if(Math.abs(dy)>10){armed=false}
    },{passive:true});
    hero.addEventListener('touchend',function(e){
      if(!armed)return;
      var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
      armed=false;
      if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){go(idx+(dx<0?1:-1),true);start()}
      else start();
    },{passive:true});
    hero.addEventListener('touchcancel',function(){armed=false;start()},{passive:true});
    hero.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'){e.preventDefault();go(idx+1,true);start()}
      else if(e.key==='ArrowLeft'){e.preventDefault();go(idx-1,true);start()}
    });
  }
  document.querySelectorAll('[data-hero-jump]').forEach(function(a){
    a.addEventListener('click',function(e){
      var href=a.getAttribute('href')||'';
      if(href.charAt(0)!=='#'||href.length<2)return;
      var t=document.querySelector(href);
      if(!t)return;
      e.preventDefault();
      t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
    });
  });
  document.addEventListener('visibilitychange',function(){document.hidden?stop():start()});
  go(0,false);
  start();
})();}catch(e){console.warn('Hero carousel init failed:',e)}

try{(function(){
  var btn=document.getElementById('threeMlMore');
  var list=document.getElementById('threeMlList');
  if(!btn||!list)return;
  btn.addEventListener('click',function(){
    var open=list.classList.toggle('three-ml-open');
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.textContent=open?'Show less':'Show all '+list.querySelectorAll('.three-ml-row').length+' fragrances';
  });
})();}catch(e){console.warn('3ml list init failed:',e)}

try{(function(){
  var root=document.getElementById('toastRoot');
  if(!root)return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function toast(msg,kind){
    kind=kind||'ok';
    var el=document.createElement('div');
    el.className='toast toast-'+(kind==='err'?'err':'ok');
    el.innerHTML='<span class="toast-icon">'+(kind==='err'?'&#9888;':'&#10003;')+'</span><span class="toast-msg"></span>'
      +'<button type="button" class="toast-x" aria-label="Dismiss">&times;</button>';
    el.querySelector('.toast-msg').textContent=String(msg||'');
    root.appendChild(el);
    var t=null;
    function dismiss(){
      if(t){clearTimeout(t);t=null}
      el.classList.add('out');
      setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},reduce?0:240);
    }
    el.querySelector('.toast-x').addEventListener('click',dismiss);
    requestAnimationFrame(function(){el.classList.add('in')});
    t=setTimeout(dismiss,3200);
    while(root.children.length>4)root.removeChild(root.firstChild);
    return dismiss;
  }
  window.__toast=toast;
})();}catch(e){console.warn('Toast init failed:',e)}

try{(function(){
  var bar=document.getElementById('announceBar');
  if(!bar)return;
  var KEY='iram_announce_dismissed';
  var MSGS=['Free shipping over \u20B9999 on 2+ decants',
            'Authentic decants \u00B7 3ml to 30ml \u00B7 ships across India',
            'New arrivals every week \u2014 tap a fragrance for details'];
  function syncH(){
    if(window.innerWidth>768){document.documentElement.style.removeProperty('--announce-h');return}
    document.documentElement.style.setProperty('--announce-h',Math.round(bar.getBoundingClientRect().height)+'px');
  }
  var dismissed=false;
  try{dismissed=sessionStorage.getItem(KEY)==='1'}catch(e){}
  if(dismissed){bar.style.display='none';return}
  var i=0;
  var track=document.getElementById('announceTrack');
  if(track&&!reduce()){
    setInterval(function(){
      if(document.hidden||bar.style.display==='none')return;
      i=(i+1)%MSGS.length;
      track.innerHTML='<span></span>';
      track.firstChild.textContent=MSGS[i];
    },6000);
  }
  document.getElementById('announceClose').addEventListener('click',function(){
    bar.style.display='none';
    try{sessionStorage.setItem(KEY,'1')}catch(e){}
    document.documentElement.style.setProperty('--announce-h','0px');
  });
  window.addEventListener('resize',syncH);
  syncH();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(syncH);
  function reduce(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches}
})();}catch(e){console.warn('Announcement init failed:',e)}
