"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { StudioMarkdown as ReactMarkdown } from "./studio-markdown";
import { FileText, ImageIcon, Film, Gift, Download, Copy, LayoutGrid, List, ArrowUpRight } from "lucide-react";
import { AccountBadge } from "./account-badge";
import type { WorkItem } from "@/lib/studio-records";
export function StudioCollection({items,goods,onView,onEdit,onDownload}:{items:WorkItem[];goods:boolean;onView:(item:WorkItem)=>void;onEdit:(item:WorkItem)=>void;onDownload:(item:WorkItem)=>void}) {
 const [selected,setSelected]=useState<string|null>(null),[grid,setGrid]=useState(true),[copied,setCopied]=useState("");
 const body=useRef<HTMLDivElement>(null);
 const item=items.find(i=>i.id===selected)||items[0];
 async function copy(text:string,label:string,rich=false){try{if(rich&&body.current&&navigator.clipboard.write&&typeof ClipboardItem!=="undefined")await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([body.current.innerHTML],{type:"text/html"}),"text/plain":new Blob([text],{type:"text/plain"})})]);else await navigator.clipboard.writeText(text);setCopied(label);setTimeout(()=>setCopied(""),1800);}catch{setCopied("复制失败，请选中文字复制");}}
 function cover(i:WorkItem,large=false){const file=i.files?.find(f=>f.mime.startsWith('image/'));const Icon=i.type.includes('视频')?Film:i.type.includes('图片')?ImageIcon:goods?Gift:FileText;return file?<Image src={file.url} alt={i.title} width={large?600:400} height={large?400:280} unoptimized/>:<div className="sc-text-cover"><Icon size={large?26:19}/><span>{i.title}</span><small>{i.type}</small></div>;}
 if(!items.length)return <div className="sc-empty"><span>{goods?<Gift size={30}/>:<ImageIcon size={30}/>}</span><h2>{goods?'还没有商品与赠品':'发布资产库是空的'}</h2><p>{goods?'添加商品信息、图片和交付文件。':'添加正文、图片、视频或文档，保留可直接发布的版本。'}</p></div>;
 return <div className="sc-desk">
  <section className="sc-shelf">
   <div className="sc-shelfbar"><span>{items.length} {goods?'件商品与赠品':'份发布资产'}</span>{!goods&&<div className="sc-viewtoggle"><button aria-label="网格视图" aria-pressed={grid} onClick={()=>setGrid(true)}><LayoutGrid size={15}/></button><button aria-label="列表视图" aria-pressed={!grid} onClick={()=>setGrid(false)}><List size={15}/></button></div>}</div>
   <div className={goods||!grid?'sc-records':'sc-grid'}>
    {items.map(i=><article key={i.id} className={'sc-card '+(i.id===item?.id?'sc-selected':'')}>
     <button className="sc-card-select" onClick={()=>{setSelected(i.id);onView(i);}} aria-label={'打开：'+i.title}>{cover(i)}<div className="sc-card-info"><strong title={i.title}>{i.title}</strong><AccountBadge id={i.account}/><div className="sc-card-meta"><span>{goods?(i.type==='赠品'?'赠品':`¥ ${i.price||'未定价'}`):i.type}</span><span>{i.status}</span></div></div></button>
     <div className="sc-card-actions"><button onClick={()=>onView(i)}>完整视图 <ArrowUpRight size={12}/></button><button onClick={()=>onEdit(i)}>编辑</button></div>
    </article>)}
   </div>
  </section>
  {item&&<aside className="sc-inspector" aria-label="内容预览">
   <div className="sc-inspector-head"><span>内容预览</span><button onClick={()=>onView(item)} aria-label="打开完整视图"><ArrowUpRight size={17}/></button></div>
   <div className="sc-preview-cover">{cover(item,true)}</div>
   <AccountBadge id={item.account}/><h2>{item.title}</h2>
   <dl className="sc-meta"><div><dt>类型</dt><dd>{item.type}</dd></div><div><dt>状态</dt><dd>{item.status}</dd></div>{goods&&<div><dt>价格</dt><dd>{item.type==='赠品'?'免费':`¥ ${item.price||'未定价'}`}</dd></div>}<div><dt>更新记录</dt><dd>{(item.date||item.createdAt||'未安排').slice(0,10)}</dd></div></dl>
   <div className="sc-copybar"><button onClick={()=>copy(item.title,'标题已复制')}><Copy size={13}/>标题</button><button onClick={()=>copy(item.body,'正文已复制',true)}><Copy size={13}/>正文</button>{goods&&<button onClick={()=>copy(item.price||'0','价格已复制')}>价格</button>}</div>
   <div className="sc-reading" ref={body}><ReactMarkdown>{item.body||'暂无正文'}</ReactMarkdown></div>
   {!!item.files?.length&&<div className="sc-files"><h3>附件 · {item.files.length}</h3>{item.files.map(f=><a key={f.id} href={f.url} download={f.name}><FileText size={14}/><span>{f.name}</span><Download size={13}/></a>)}</div>}
   {goods&&item.delivery&&<div className="sc-delivery"><h3>交付说明</h3><p>{item.delivery}</p></div>}
   <div className="sc-inspector-actions"><button onClick={()=>onDownload(item)}><Download size={14}/>导出</button><button className="sv-primary" onClick={()=>onEdit(item)}>编辑内容</button></div>
   <span className="sc-copy-status" role="status">{copied}</span>
  </aside>}
 </div>;
}
export function StudioTaskPreview({item,onView,onEdit}:{item:WorkItem;onView:()=>void;onEdit:()=>void}) {
 return <aside className="sc-inspector sc-task-preview"><div className="sc-inspector-head"><span>当前内容</span><FileText size={14}/></div><AccountBadge id={item.account}/><h2>{item.title}</h2><dl className="sc-meta"><div><dt>环节</dt><dd>{item.kind}</dd></div><div><dt>状态</dt><dd>{item.todoState||item.status}</dd></div></dl><div className="sc-reading"><ReactMarkdown>{item.body||'尚未填写正文'}</ReactMarkdown></div>{!!item.files?.length&&<div className="sc-files"><h3>附件 · {item.files.length}</h3>{item.files.map(f=><a key={f.id} href={f.url} download={f.name}><FileText size={14}/><span>{f.name}</span><Download size={13}/></a>)}</div>}<div className="sc-inspector-actions"><button onClick={onView}>完整视图</button><button className="sv-primary" onClick={onEdit}>编辑</button></div></aside>;
}
