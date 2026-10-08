import type { CSSProperties } from 'react';
// One catalog drives selection, live surfaces and miniature layout previews.
export const themes = [
 {id:'frost',group:'essential',name:'基础',description:'清晰平面 · 紧凑列表',bg:'#f5f6f7',surface:'#ffffff',ink:'#242830',muted:'#69717d',border:'#e1e5ea',side:'#eef1f4',sideInk:'#4d5663',accent:'#365c86',soft:'#e8eff7',accentInk:'#ffffff'},
 {id:'obsidian',group:'material',name:'黑曜石',description:'悬浮导航 · 烟黑与冷光',bg:'#111313',surface:'#1b1e1d',ink:'#eff1e9',muted:'#a7afa7',border:'#343a35',side:'#1a1d1bed',sideInk:'#bdc5bc',accent:'#d1e979',soft:'#303a22',accentInk:'#1c2610'},
 {id:'ceramic',group:'material',name:'暖银陶瓷',description:'展陈网格 · 暖银与酒红',bg:'#eee9e2',surface:'#fcf9f3',ink:'#332923',muted:'#7a6e63',border:'#dcd2c6',side:'#dcd7ce',sideInk:'#63594f',accent:'#622d32',soft:'#efe0de',accentInk:'#fff9f0'},
 {id:'solarpunk',group:'art',name:'太阳朋克',description:'日光面板 · 绿玻璃与陶瓷',bg:'#eff1e5',surface:'#fffef5',ink:'#303c2b',muted:'#697460',border:'#d8dfc8',side:'#e1e8d4e8',sideInk:'#526546',accent:'#56743a',soft:'#e7edd6',accentInk:'#ffffff'},
 {id:'esoteric',group:'art',name:'神秘学',description:'阅读分栏 · 月银与古金',bg:'#151219',surface:'#211d26',ink:'#ece4dd',muted:'#b5a8b8',border:'#403744',side:'#1b161f',sideInk:'#c0b2c4',accent:'#d7b982',soft:'#3a2f36',accentInk:'#251c22'},
 {id:'oriental',group:'art',name:'东方美学',description:'漆面导航 · 宣纸与朱砂',bg:'#f1eee5',surface:'#fffdf6',ink:'#282c29',muted:'#73756b',border:'#dad9c9',side:'#153e35',sideInk:'#dfdfc9',accent:'#a23d30',soft:'#f2e1d8',accentInk:'#fffaf0'},
 {id:'wabi',group:'art',name:'侘寂',description:'宽幅留白 · 石色与纸纹',bg:'#edeae3',surface:'#f8f6ef',ink:'#3c3b35',muted:'#777469',border:'#d8d5cb',side:'#e3e0d6',sideInk:'#68655b',accent:'#796651',soft:'#e8e1d5',accentInk:'#ffffff'},
 {id:'baroque',group:'art',name:'巴洛克',description:'画廊分栏 · 丝绒与鎏金',bg:'#f0e9dc',surface:'#fffbf1',ink:'#38271f',muted:'#83715d',border:'#dbceb7',side:'#381820',sideInk:'#e7d5ba',accent:'#6b2431',soft:'#f0dfd6',accentInk:'#fff1d8'},
] as const;
export const themeGroups = [{id:'essential',name:'基础'},{id:'material',name:'现代材质'},{id:'art',name:'艺术风格'}] as const;
export function themeVariables(id:string):CSSProperties {
 const t=themes.find(t=>t.id===id)||themes[0];
 const dark=t.id==='obsidian'||t.id==='esoteric';
 return {'--sv-background':t.bg,'--sv-surface':t.surface,'--sv-ink':t.ink,'--sv-muted':t.muted,'--sv-border':t.border,'--sv-green':t.accent,'--studio-sidebar':t.side,'--sidebar-ink':t.sideInk,'--studio-brand':'#254e62','--fish-cutout':'#254e62','--studio-control':t.surface,'--studio-accent-soft':t.soft,'--studio-hover':t.soft,'--studio-accent-ink':t.accentInk,'--studio-status-bg':t.soft,'--studio-status-ink':t.muted,'--studio-success-bg':dark?'#253a2e':'#eaf2e6','--studio-success-ink':dark?'#b9d8ac':'#416343','--studio-amber-bg':dark?'#403522':'#faf0d9','--studio-amber-ink':dark?'#e4c57d':'#886327','--studio-error-bg':dark?'#44272d':'#f9e9e7','--studio-error-ink':dark?'#edacb8':'#a44a52',colorScheme:dark?'dark':'light'} as CSSProperties;
}
export function previewVariables(id:string):CSSProperties {
 const t=themes.find(t=>t.id===id)||themes[0];
 return {'--preview-bg':t.bg,'--preview-side':t.side,'--preview-surface':t.surface,'--preview-accent':t.accent,'--preview-art':'none'} as CSSProperties;
}
