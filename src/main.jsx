import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Maximize2, Music2, ChevronLeft, ChevronRight } from 'lucide-react'
import './styles.css'

const tracks = [
  { title:'Neon Heartbeat', artist:'Melodify', cover:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80' },
  { title:'Midnight Drive', artist:'Melodify', cover:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80' },
  { title:'Afterglow', artist:'Melodify', cover:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80' },
]

function App(){
  const [active,setActive]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [lyrics,setLyrics]=useState(false)
  const [progress,setProgress]=useState(32)
  const track=tracks[active]

  useEffect(()=>{ if(!playing)return; const id=setInterval(()=>setProgress(p=>p>=100?0:p+0.5),1000); return()=>clearInterval(id)},[playing])

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>Melodify</span></div>
      <nav>
        <button className="nav-item active"><Home size={19}/>Home</button>
        <button className="nav-item"><Search size={19}/>Search</button>
        <button className="nav-item"><Library size={19}/>Your Library</button>
      </nav>
      <div className="side-section"><p>YOUR MUSIC</p><button className="nav-item"><Heart size={18}/>Liked Songs</button><button className="nav-item"><ListMusic size={18}/>Playlists</button></div>
      <div className="sidebar-bottom"><span>Ad-free listening</span><small>Melodify • 2026</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="arrows"><button><ChevronLeft/></button><button><ChevronRight/></button></div><div className="profile">A</div></header>
      <section className="hero">
        <div><p className="eyebrow">GOOD AFTERNOON</p><h1>Made for your mood.</h1><p className="sub">Your music, uninterrupted.</p></div>
        <div className="hero-actions"><button className="circle-btn"><Play fill="currentColor"/></button><span>Play something</span></div>
      </section>

      <section className="content">
        <div className="section-head"><h2>Made for you</h2><button>Show all</button></div>
        <div className="cards">{tracks.map((t,i)=><button className={`track-card ${i===active?'selected':''}`} onClick={()=>{setActive(i);setPlaying(true)}} key={t.title}><img src={t.cover}/><strong>{t.title}</strong><span>{t.artist}</span></button>)}</div>
        <div className="section-head second"><h2>Recently played</h2></div>
        <div className="recent">{tracks.map((t,i)=><button onClick={()=>setActive(i)} key={t.title}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={17} fill="currentColor"/></button>)}</div>
      </section>
    </main>

    <div className="now-playing">
      <div className="art-stage">
        <div className={`disc ${playing?'spinning':''}`}><img src={track.cover}/><span/></div>
      </div>
      <div className="player-info"><div><strong>{track.title}</strong><span>{track.artist}</span></div><button><Heart size={18}/></button></div>
      <div className="controls"><div className="control-row"><button><SkipBack fill="currentColor"/></button><button className="play-main" onClick={()=>setPlaying(!playing)}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button><SkipForward fill="currentColor"/></button></div><div className="progress"><span style={{width:`${progress}%`}}/></div><div className="time"><span>1:12</span><span>3:42</span></div></div>
      <div className="player-actions"><button className={lyrics?'lyrics active':''} onClick={()=>setLyrics(!lyrics)}><Music2 size={17}/>Lyrics</button><button><Volume2 size={18}/></button><button><Maximize2 size={17}/></button></div>
      {lyrics&&<div className="lyrics-panel"><div className="lyrics-head"><span>LYRICS</span><button onClick={()=>setLyrics(false)}>Close</button></div><h3>Neon Heartbeat</h3><p>We're driving through the city lights<br/>with a neon heartbeat tonight...</p></div>}
    </div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)