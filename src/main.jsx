import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Maximize2, Music2, ChevronLeft, ChevronRight, Clock3, Radio, User, X, PanelLeftClose } from 'lucide-react'
import './styles.css'

const tracks = [
  { title:'Neon Heartbeat', artist:'Melodify', duration:222, lyrics:[["We're driving through the city lights",0],["with a neon heartbeat tonight",18],["Lost inside the sound",38],["until the morning comes",58],["Nothing but the radio",80],["and the glow of you and I",101]], cover:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80' },
  { title:'Midnight Drive', artist:'Melodify', duration:228, lyrics:[["Streetlights blur across the glass",0],["we leave the world behind",16],["Midnight on the radio",34],["and nowhere else to go",53],["Every mile becomes a memory",74],["until the sunrise finds us",96]], cover:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80' },
  { title:'Afterglow', artist:'Melodify', duration:216, lyrics:[["We stayed awake beneath the stars",0],["watching every color fade",15],["Afterglow around us",33],["nothing left to say",51],["Hold this moment a little longer",70],["before it slips away",92]], cover:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80' },
  { title:'Velvet Skies', artist:'Melodify', duration:224, lyrics:[["Floating underneath the velvet skies",0],["we let the night decide",17],["Take me somewhere quiet",36],["where the city disappears",55],["All we need is this",76],["and the sound inside our ears",98]], cover:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80' },
  { title:'Night Bloom', artist:'Melodify', duration:218, lyrics:[["The city sleeps but we are wide awake",0],["chasing every sound",16],["Watch the night bloom",34],["as the beat comes around",52],["We keep moving through the darkness",73],["until the morning breaks",94]], cover:'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80' },
  { title:'Electric Rain', artist:'Melodify', duration:220, lyrics:[["Electric rain is falling down",0],["neon running through the street",17],["We disappear into the sound",35],["every heartbeat finds the beat",54],["Keep the night alive",76],["until we finally breathe",98]], cover:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80' },
]

const pages = {
  home: { label:'Home', icon:Home },
  search: { label:'Search', icon:Search },
  library: { label:'Your Library', icon:Library },
  liked: { label:'Liked Songs', icon:Heart },
  playlists: { label:'Playlists', icon:ListMusic },
  history: { label:'History', icon:Clock3 },
  radio: { label:'Radio', icon:Radio },
}

function App(){
  const [page,setPage]=useState('home')
  const [active,setActive]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [lyricsPage,setLyricsPage]=useState(false)
  const [progress,setProgress]=useState(32)
  const [search,setSearch]=useState('')
  const track=tracks[active]

  useEffect(()=>{ if(!playing)return; const id=setInterval(()=>setProgress(p=>p>=100?0:p+100/(track.duration||222)),1000); return()=>clearInterval(id)},[playing,track.duration])
  const currentSeconds=Math.min((progress/100)*(track.duration||222),track.duration||222)
  const formatTime=(seconds)=>{const s=Math.floor(seconds);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}

  const playTrack=(i)=>{setActive(i);setProgress(0);setPlaying(true)}
  const filtered=tracks.filter(t=>(t.title+' '+t.artist).toLowerCase().includes(search.toLowerCase()))

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>Melodify</span></div>
      <nav>
        {['home','search','library'].map(key=>{const P=pages[key];return <button key={key} className={'nav-item '+(page===key?'active':'')} onClick={()=>setPage(key)}><P.icon size={18}/><span>{P.label}</span></button>})}
      </nav>
      <div className="side-section">
        <p>YOUR MUSIC</p>
        {['liked','playlists','history'].map(key=>{const P=pages[key];return <button key={key} className={'nav-item '+(page===key?'active':'')} onClick={()=>setPage(key)}><P.icon size={17}/><span>{P.label}</span></button>})}
      </div>
      <div className="side-section radio-link"><button className={'nav-item '+(page==='radio'?'active':'')} onClick={()=>setPage('radio')}><Radio size={17}/><span>Radio</span></button></div>
      <div className="sidebar-bottom"><span>Ad-free listening</span><small>Melodify • 2026</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="arrows"><button><ChevronLeft/></button><button><ChevronRight/></button></div><div className="profile"><User size={16}/></div></header>

      {page==='home' && <HomePage playTrack={playTrack} setPage={setPage}/>}
      {page==='search' && <SearchPage search={search} setSearch={setSearch} tracks={filtered} playTrack={playTrack}/>}
      {page==='library' && <LibraryPage tracks={tracks} playTrack={playTrack}/>}
      {page==='liked' && <CollectionPage title="Liked Songs" subtitle="Your favorite tracks in one place." icon={Heart} tracks={tracks.slice(0,4)} playTrack={playTrack}/>}
      {page==='playlists' && <PlaylistsPage tracks={tracks} playTrack={playTrack}/>}
      {page==='history' && <CollectionPage title="Recently Played" subtitle="Pick up where you left off." icon={Clock3} tracks={tracks.slice().reverse()} playTrack={playTrack}/>}
      {page==='radio' && <RadioPage playTrack={playTrack}/>}
      {lyricsPage && <LyricsPage track={track} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} close={()=>setLyricsPage(false)} formatTime={formatTime}/>} 
    </main>

    <div className="now-playing">
      <div className="art-stage"><div className={'disc '+(playing?'spinning':'')}><img src={track.cover}/><span/></div></div>
      <div className="player-info"><div><strong>{track.title}</strong><span>{track.artist}</span></div><button><Heart size={17}/></button></div>
      <div className="controls"><div className="control-row"><button onClick={()=>playTrack((active-1+tracks.length)%tracks.length)}><SkipBack fill="currentColor"/></button><button className="play-main" onClick={()=>setPlaying(!playing)}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={()=>playTrack((active+1)%tracks.length)}><SkipForward fill="currentColor"/></button></div><div className="progress"><span style={{width:progress+'%'}}/></div><div className="time"><span>{formatTime(currentSeconds)}</span><span>{formatTime(track.duration||222)}</span></div></div>
      <div className="player-actions"><button className={'lyrics '+(lyricsPage?'active':'')} onClick={()=>setLyricsPage(true)}><Music2 size={16}/>Lyrics</button><button><Volume2 size={17}/></button><button><Maximize2 size={16}/></button></div>

    </div>
  </div>
}

function HomePage({playTrack,setPage}){
 return <section className="page"><section className="hero"><div><p className="eyebrow">GOOD AFTERNOON</p><h1>Made for your mood.</h1><p className="sub">Your music, uninterrupted.</p></div><button className="circle-btn" onClick={()=>playTrack(0)}><Play fill="currentColor"/></button></section><Section title="Made for you" action="Show all" onAction={()=>setPage('library')}><div className="cards">{tracks.slice(0,4).map((t,i)=><TrackCard key={t.title} t={t} i={i} playTrack={playTrack}/>)}</div></Section><Section title="Recently played"><div className="recent">{tracks.slice(0,5).map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>
}

function SearchPage({search,setSearch,tracks,playTrack}){return <section className="page"><div className="page-title"><p className="eyebrow">DISCOVER</p><h1>Search</h1><div className="search-box"><Search size={18}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="What do you want to listen to?"/></div></div><Section title={search?'Results':'Browse all'}><div className="cards">{tracks.map((t,i)=><TrackCard key={t.title} t={t} i={i} playTrack={playTrack}/>)}</div></Section></section>}

function LibraryPage({tracks,playTrack}){return <section className="page"><div className="page-title"><p className="eyebrow">COLLECTION</p><h1>Your Library</h1><p className="sub">Everything you keep close.</p></div><Section title="Saved music"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>}

function CollectionPage({title,subtitle,icon:Icon,tracks,playTrack}){return <section className="page"><div className="collection-hero"><div className="collection-icon"><Icon/></div><div><p className="eyebrow">YOUR MUSIC</p><h1>{title}</h1><p className="sub">{subtitle}</p></div></div><Section title="Tracks"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(tracks.indexOf(t))}/>)}</div></Section></section>}

function PlaylistsPage({tracks,playTrack}){return <section className="page"><div className="page-title"><p className="eyebrow">YOUR MUSIC</p><h1>Playlists</h1></div><div className="playlist-grid">{['Late Night','Focus Mode','Main Character','Weekend Energy'].map((name,i)=><button className="playlist-card" key={name} onClick={()=>playTrack(i)}><img src={tracks[i].cover}/><div><strong>{name}</strong><span>{tracks.length} tracks</span></div><Play size={18} fill="currentColor"/></button>)}</div></section>}

function RadioPage({playTrack}){return <section className="page"><div className="radio-hero"><div><p className="eyebrow">MUSIC WITHOUT THE WORK</p><h1>Melodify Radio</h1><p className="sub">Endless mixes built around your mood.</p></div><button className="circle-btn" onClick={()=>playTrack(2)}><Play fill="currentColor"/></button></div><Section title="Stations"><div className="cards">{tracks.slice(1,5).map((t,i)=><TrackCard key={t.title} t={t} i={i+1} playTrack={playTrack}/>)}</div></Section></section>}

function Section({title,action,onAction,children}){return <section className="content-section"><div className="section-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}</button>}</div>{children}</section>}
function TrackCard({t,i,playTrack}){return <button className="track-card" onClick={()=>playTrack(i)}><img src={t.cover}/><strong>{t.title}</strong><span>{t.artist}</span><span className="card-play"><Play size={15} fill="currentColor"/></span></button>}
function RecentRow({t,onClick}){return <button className="recent-row" onClick={onClick}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={16} fill="currentColor"/></button>}

createRoot(document.getElementById('root')).render(<App />)

function LyricsPage({track,playing,setPlaying,progress,setProgress,close,formatTime}){
  const activeRef=useRef(null);
  const seconds=(progress/100)*(track.duration||222);
  const lines=track.lyrics||[];
  let activeIndex=-1;
  lines.forEach((line,i)=>{if(seconds>=line[1])activeIndex=i});
  useEffect(()=>{activeRef.current?.scrollIntoView({behavior:'smooth',block:'center'})},[activeIndex]);
  return <div className="lyrics-page">
    <header className="lyrics-page-top"><button className="lyrics-back" onClick={close}><ChevronLeft size={19}/><span>Back</span></button><div className="lyrics-label">NOW PLAYING</div><button className="lyrics-more"><PanelLeftClose size={17}/></button></header>
    <div className="lyrics-layout">
      <div className="lyrics-art-wrap"><div className={'lyrics-art '+(playing?'spinning-art':'')}><img src={track.cover}/></div><div className="lyrics-track"><strong>{track.title}</strong><span>{track.artist}</span></div></div>
      <div className="lyrics-content"><p className="eyebrow">LYRICS</p><h1>{track.title}</h1><div className="lyrics-scroll">{lines.map(([text,time],i)=><p key={i} ref={i===activeIndex?activeRef:null} className={'lyrics-line '+(i===activeIndex?'active-line ':'')+(i<activeIndex?'past-line':'')} onClick={()=>setProgress((time/(track.duration||222))*100)}>{text}<small>{formatTime(time)}</small></p>)}</div></div>
    </div>
    <div className="lyrics-player"><div className="mini-track"><img src={track.cover}/><div><strong>{track.title}</strong><span>{track.artist}</span></div></div><div className="lyrics-controls"><div><button><SkipBack size={17}/></button><button className="lyrics-play" onClick={()=>setPlaying(!playing)}>{playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button><button><SkipForward size={17}/></button></div><div className="lyrics-progress" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setProgress(((e.clientX-r.left)/r.width)*100)}}><span style={{width:progress+'%'}}/></div><div className="lyrics-time"><span>{formatTime(seconds)}</span><span>{formatTime(track.duration||222)}</span></div></div><div className="lyrics-actions"><button><Heart size={17}/></button><button><Volume2 size={17}/></button></div></div>
  </div>
}
