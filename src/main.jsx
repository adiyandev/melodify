import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Maximize2, Music2, ChevronLeft, ChevronRight, Clock3, Radio, User, X, PanelLeftClose, PanelRight } from 'lucide-react'
import './styles.css'

const pages = {
  home: { label:'Home', icon:Home },
  search: { label:'Search', icon:Search },
  library: { label:'Your Library', icon:Library },
  liked: { label:'Liked Songs', icon:Heart },
  playlists: { label:'Playlists', icon:ListMusic },
  history: { label:'History', icon:Clock3 },
  radio: { label:'Radio', icon:Radio },
}

const JAMENDO_URL='https://api.jamendo.com/v3.0';
const JAMENDO_CLIENT_ID=import.meta.env.VITE_JAMENDO_CLIENT_ID||'709fa152';
function mapJamendoTrack(t){return {id:String(t.id),title:t.name||'Unknown track',artist:t.artist_name||'Unknown artist',duration:Number(t.duration)||0,cover:t.image||t.album_image||'',album:t.album_name||'Single',audioUrl:t.audio||'',license:t.license_ccurl||'',lyrics:[]}}
async function fetchJamendo(path){const res=await fetch(JAMENDO_URL+path);if(!res.ok)throw new Error('Jamendo request failed');const data=await res.json();if(data.headers?.status!=='success')throw new Error(data.headers?.error_message||'Jamendo request failed');return data.results||[]}
async function searchMusic(query){const q=query.trim();if(!q)return [];const results=await fetchJamendo('/tracks/?client_id='+encodeURIComponent(JAMENDO_CLIENT_ID)+'&format=json&limit=30&order=relevance&audioformat=mp32&type=single+albumtrack&search='+encodeURIComponent(q));return results.filter(t=>t.audio).map(mapJamendoTrack)}
async function getFeaturedMusic(){const results=await fetchJamendo('/charts/track/?client_id='+encodeURIComponent(JAMENDO_CLIENT_ID)+'&format=json&limit=20&audioformat=mp32');return results.filter(t=>t.audio).map(mapJamendoTrack)}
function loadPlaylists(){try{return JSON.parse(localStorage.getItem('melodify-playlists')||'[]')}catch{return []}}
function App(){
  const [page,setPage]=useState('home')
  const [tracks,setTracks]=useState([])
  const [active,setActive]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [lyricsPage,setLyricsPage]=useState(false)
  const [progress,setProgress]=useState(32)
  const [search,setSearch]=useState('')
  const [sidebarOpen,setSidebarOpen]=useState(true)
  const [artistPanelOpen,setArtistPanelOpen]=useState(false)
  const [musicResults,setMusicResults]=useState([])
  const [searching,setSearching]=useState(false)
  const [searchError,setSearchError]=useState('')
  const [playlists,setPlaylists]=useState(loadPlaylists)
  const [selectedPlaylist,setSelectedPlaylist]=useState(null)
  const [playlistEditor,setPlaylistEditor]=useState(null)
  const [remoteTrack,setRemoteTrack]=useState(null)
  const [volume,setVolume]=useState(1)
  const audioRef=useRef(null)
  const track=remoteTrack||tracks[active]||null

  useEffect(()=>{localStorage.setItem('melodify-playlists',JSON.stringify(playlists))},[playlists])
  useEffect(()=>{let cancelled=false;(async()=>{try{const featured=await getFeaturedMusic();if(!cancelled)setTracks(featured)}catch(error){console.error('Jamendo catalog failed',error)}})();return()=>{cancelled=true}},[])
  useEffect(()=>{const audio=audioRef.current;if(!audio||!track?.audioUrl)return;audio.volume=volume;if(playing)audio.play().catch(()=>setPlaying(false));else audio.pause()},[playing,track.audioUrl,volume])
  useEffect(()=>{if(!track||track.audioUrl||!playing)return;const id=setInterval(()=>setProgress(p=>p>=100?0:p+100/(track.duration||222)),1000);return()=>clearInterval(id)},[playing,track.audioUrl,track.duration])
  useEffect(()=>{setProgress(0)},[track?.id])
  const currentSeconds=Math.min((progress/100)*(track?.duration||0),track?.duration||0)
  const formatTime=(seconds)=>{const s=Math.floor(seconds);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}

  const playTrack=(i)=>{if(!tracks[i])return;setRemoteTrack(null);setActive(i);setProgress(0);setPlaying(true)}
  const playMusicTrack=(t)=>{setRemoteTrack(t);setProgress(0);setPlaying(true)}
  const addToPlaylist=(playlistId,t)=>{setPlaylists(v=>v.map(p=>p.id===playlistId?{...p,tracks:p.tracks.some(x=>x.id===t.id)?p.tracks:[...p.tracks,t]}:p))}
  useEffect(()=>{if(page!=='search'||search.trim().length<2){setMusicResults([]);setSearchError('');return}const timer=setTimeout(async()=>{setSearching(true);try{setMusicResults(await searchMusic(search));setSearchError('')}catch{setSearchError('Music search is temporarily unavailable.')}finally{setSearching(false)}},450);return()=>clearTimeout(timer)},[search,page])

  return <div className="app"><audio ref={audioRef} src={track?.audioUrl||undefined} onTimeUpdate={e=>track?.audioUrl&&setProgress(e.currentTarget.duration?(e.currentTarget.currentTime/e.currentTarget.duration)*100:0)} onLoadedMetadata={e=>track.audioUrl&&setProgress((e.currentTarget.currentTime/e.currentTarget.duration)*100)} onEnded={()=>setPlaying(false)} preload="metadata" />
    <aside className={"sidebar "+(sidebarOpen?"sidebar-open":"sidebar-collapsed")}>
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
      <header className="topbar"><div className="topbar-left"><button className="sidebar-toggle" onClick={()=>setSidebarOpen(v=>!v)} title="Toggle sidebar">{sidebarOpen?<PanelLeftClose size={17}/>:<PanelRight size={17}/>}</button><div className="arrows"><button><ChevronLeft/></button><button><ChevronRight/></button></div></div><div className="profile"><User size={16}/></div></header>

      {page==='home' && <HomePage tracks={tracks} playTrack={playTrack} setPage={setPage}/>}
      {page==='search' && <SearchPage search={search} setSearch={setSearch} tracks={tracks} playTrack={playTrack} musicResults={musicResults} searching={searching} searchError={searchError} playMusicTrack={playMusicTrack} playlists={playlists} addToPlaylist={addToPlaylist}/>}
      {page==='library' && <LibraryPage tracks={tracks} playTrack={playTrack}/>}
      {page==='liked' && <CollectionPage title="Liked Songs" subtitle="Your favorite tracks in one place." icon={Heart} tracks={tracks.slice(0,4)} playTrack={playTrack}/>}
      {page==='playlists' && <PlaylistsPage playlists={playlists} setPlaylists={setPlaylists} tracks={tracks} playTrack={playTrack} playMusicTrack={playMusicTrack} selectedPlaylist={selectedPlaylist} setSelectedPlaylist={setSelectedPlaylist} playlistEditor={playlistEditor} setPlaylistEditor={setPlaylistEditor}/>}
      {page==='history' && <CollectionPage title="Recently Played" subtitle="Pick up where you left off." icon={Clock3} tracks={tracks.slice().reverse()} playTrack={playTrack}/>}
      {page==='radio' && <RadioPage playTrack={playTrack}/>}
      {lyricsPage && <LyricsPage sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} track={track} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} close={()=>setLyricsPage(false)} formatTime={formatTime}/>} 
    </main>

    {artistPanelOpen && <ArtistSidebar track={track} playTrack={playTrack} active={active} close={()=>setArtistPanelOpen(false)}/>}\n\n    {track && <div className="now-playing">
      <div className="apple-player-track"><div className={'disc '+(playing?'spinning':'')}><img src={track.cover}/><span/></div><div className="apple-track-meta"><strong>{track.title}</strong><span>{track.artist}</span></div><button className="apple-like"><Heart size={16}/></button></div>
      <div className="apple-player-center"><div className="apple-control-row"><button onClick={()=>playTrack((active-1+tracks.length)%tracks.length)}><SkipBack fill="currentColor"/></button><button className="apple-play" onClick={()=>setPlaying(!playing)}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={()=>playTrack((active+1)%tracks.length)}><SkipForward fill="currentColor"/></button></div><div className="apple-progress-row" onClick={e=>{if(!track.audioUrl)return;const r=e.currentTarget.getBoundingClientRect();const pct=(e.clientX-r.left)/r.width;setProgress(pct*100);if(audioRef.current&&audioRef.current.duration)audioRef.current.currentTime=pct*audioRef.current.duration}}><span>{formatTime(currentSeconds)}</span><div className="progress"><span style={{width:progress+'%'}}/></div><span>{formatTime(track.duration||222)}</span></div></div>
      <div className="apple-player-actions"><button className={'lyrics '+(lyricsPage?'active':'')} onClick={()=>setLyricsPage(true)}><Music2 size={16}/><span>Lyrics</span></button><label className="volume-control"><Volume2 size={17}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button onClick={()=>setArtistPanelOpen(v=>!v)} className={artistPanelOpen?'panel-active':''}><PanelRight size={16}/></button><button><Maximize2 size={16}/></button></div>
    </div>}
  </div>
}


function ArtistSidebar({track,playTrack,active,close}){return <aside className="artist-sidebar"><div className="artist-sidebar-head"><span>NOW PLAYING</span><button onClick={close}><X size={16}/></button></div><div className="artist-feature"><img src={track.cover}/><div><strong>{track.artist}</strong><span>Artist</span></div><button className="follow-btn">Follow</button></div><div className="artist-section"><div className="artist-section-head"><h3>About the artist</h3><button>More</button></div><p>Melodify artists bring late-night sounds, neon moods and songs made for uninterrupted listening.</p></div><div className="artist-section"><h3>Popular</h3>{tracks.slice(0,4).map((t,i)=><button className={'artist-track '+(i===active?'current':'')} key={t.title} onClick={()=>playTrack(i)}><img src={t.cover}/><span><strong>{t.title}</strong><small>{t.artist}</small></span><Play size={14} fill="currentColor"/></button>)}</div></aside>}
function HomePage({tracks,playTrack,setPage}){
 return <section className="page"><section className="hero"><div><p className="eyebrow">GOOD AFTERNOON</p><h1>Made for your mood.</h1><p className="sub">Your music, uninterrupted.</p></div><button className="circle-btn" onClick={()=>playTrack(0)}><Play fill="currentColor"/></button></section><Section title="Made for you" action="Show all" onAction={()=>setPage('library')}><div className="cards">{tracks.slice(0,4).map((t,i)=><TrackCard key={t.title} t={t} i={i} playTrack={playTrack}/>)}</div></Section><Section title="Recently played"><div className="recent">{tracks.slice(0,5).map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>
}

function SearchPage({search,setSearch,tracks,playTrack,musicResults,searching,searchError,playMusicTrack,playlists,addToPlaylist}){return <section className="page"><div className="page-title"><p className="eyebrow">DISCOVER</p><h1>Search</h1><div className="search-box"><Search size={18}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search songs, artists or albums"/></div></div>{search.trim().length>=2?<Section title="Music catalog"><div className="recent">{searching?<div className="search-status">Searching the music catalog…</div>:searchError?<div className="search-status">{searchError}</div>:musicResults.length?musicResults.map(t=><div className="recent-row catalog-row" key={t.id}><button className="catalog-main" onClick={()=>playMusicTrack(t)}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist} · {t.album}</span></div><Play size={16} fill="currentColor"/></button><select aria-label={"Add "+t.title+" to playlist"} defaultValue="" onChange={e=>{if(e.target.value){addToPlaylist(e.target.value,t);e.target.value=''}}}><option value="">＋</option>{playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>):<div className="search-status">No catalog results found.</div>}</div></Section>:<Section title="Trending on Jamendo"><div className="cards">{tracks.map((t,i)=><TrackCard key={t.title} t={t} i={i} playTrack={playTrack}/>)}</div></Section>}</section>}

function LibraryPage({tracks,playTrack}){return <section className="page"><div className="page-title"><p className="eyebrow">COLLECTION</p><h1>Your Library</h1><p className="sub">Everything you keep close.</p></div><Section title="Saved music"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>}

function CollectionPage({title,subtitle,icon:Icon,tracks,playTrack}){return <section className="page"><div className="collection-hero"><div className="collection-icon"><Icon/></div><div><p className="eyebrow">YOUR MUSIC</p><h1>{title}</h1><p className="sub">{subtitle}</p></div></div><Section title="Tracks"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.title} t={t} onClick={()=>playTrack(tracks.indexOf(t))}/>)}</div></Section></section>}

function PlaylistsPage({playlists,setPlaylists,tracks,playTrack,playMusicTrack,selectedPlaylist,setSelectedPlaylist,playlistEditor,setPlaylistEditor}){const create=()=>{const p={id:Date.now().toString(),name:'New Playlist',description:'',tracks:[]};setPlaylists(v=>[...v,p]);setPlaylistEditor(p)};const update=patch=>{setPlaylists(v=>v.map(p=>p.id===playlistEditor.id?{...p,...patch}:p));setPlaylistEditor(p=>({...p,...patch}))};const remove=id=>{setPlaylists(v=>v.filter(p=>p.id!==id));setSelectedPlaylist(null);setPlaylistEditor(null)};if(selectedPlaylist){const p=playlists.find(x=>x.id===selectedPlaylist.id)||selectedPlaylist;return <section className="page"><button className="back-link" onClick={()=>setSelectedPlaylist(null)}>← All playlists</button><div className="playlist-detail"><div className="playlist-detail-cover"><img src={p.tracks[0]?.cover||tracks[0].cover}/></div><div><p className="eyebrow">PLAYLIST</p><h1>{p.name}</h1><p className="sub">{p.description||'Your personal collection.'}</p><div className="playlist-detail-actions"><button onClick={()=>setPlaylistEditor(p)}>Edit playlist</button><button className="danger" onClick={()=>remove(p.id)}>Delete</button></div></div></div><Section title={p.tracks.length+' tracks'}><div className="recent">{p.tracks.map(t=><button className="recent-row" key={t.id} onClick={()=>t.audioUrl?playMusicTrack(t):null}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={16} fill="currentColor"/></button>)}{!p.tracks.length&&<div className="search-status">This playlist is empty.</div>}</div></Section></section>}return <section className="page"><div className="page-title playlist-heading"><div><p className="eyebrow">YOUR MUSIC</p><h1>Playlists</h1></div><button className="create-playlist" onClick={create}>+ New playlist</button></div><div className="playlist-grid">{playlists.map(p=><button className="playlist-card" key={p.id} onClick={()=>setSelectedPlaylist(p)}><img src={p.tracks[0]?.cover||tracks[0].cover}/><div><strong>{p.name}</strong><span>{p.tracks.length} tracks</span></div><Play size={18} fill="currentColor"/></button>)}{!playlists.length&&<div className="empty-playlists">No playlists yet. Create your first one.</div>}</div>{playlistEditor&&<div className="modal-backdrop" onClick={()=>setPlaylistEditor(null)}><div className="playlist-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Edit playlist</h2><button onClick={()=>setPlaylistEditor(null)}>×</button></div><label>Name<input value={playlistEditor.name} onChange={e=>update({name:e.target.value})}/></label><label>Description<textarea value={playlistEditor.description} onChange={e=>update({description:e.target.value})}/></label><div className="modal-actions"><button onClick={()=>setPlaylistEditor(null)}>Done</button></div></div></div>}</section>}

function RadioPage({playTrack}){return <section className="page"><div className="radio-hero"><div><p className="eyebrow">MUSIC WITHOUT THE WORK</p><h1>Melodify Radio</h1><p className="sub">Endless mixes built around your mood.</p></div><button className="circle-btn" onClick={()=>playTrack(2)}><Play fill="currentColor"/></button></div><Section title="Stations"><div className="cards">{tracks.slice(1,5).map((t,i)=><TrackCard key={t.title} t={t} i={i+1} playTrack={playTrack}/>)}</div></Section></section>}

function Section({title,action,onAction,children}){return <section className="content-section"><div className="section-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}</button>}</div>{children}</section>}
function TrackCard({t,i,playTrack}){return <button className="track-card" onClick={()=>playTrack(i)}><img src={t.cover}/><strong>{t.title}</strong><span>{t.artist}</span><span className="card-play"><Play size={15} fill="currentColor"/></span></button>}
function RecentRow({t,onClick}){return <button className="recent-row" onClick={onClick}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={16} fill="currentColor"/></button>}

createRoot(document.getElementById('root')).render(<App />)

function LyricsPage({sidebarOpen,setSidebarOpen,track,playing,setPlaying,progress,setProgress,close,formatTime}){
  const activeRef=useRef(null);
  const seconds=(progress/100)*(track.duration||222);
  const lines=track.lyrics||[];
  let activeIndex=-1;
  lines.forEach((line,i)=>{if(seconds>=line[1])activeIndex=i});
  useEffect(()=>{activeRef.current?.scrollIntoView({behavior:'smooth',block:'center'})},[activeIndex]);
  return <div className="lyrics-page">
    <header className="lyrics-page-top"><button className="lyrics-back" onClick={close}><ChevronLeft size={19}/><span>Back</span></button><div className="lyrics-label">NOW PLAYING</div><button className="lyrics-more" onClick={()=>setSidebarOpen(v=>!v)}><PanelLeftClose size={17}/></button></header>
    <div className="lyrics-layout">
      <div className="lyrics-art-wrap"><div className="lyrics-art"><img src={track.cover}/></div><div className="lyrics-track"><strong>{track.title}</strong><span>{track.artist}</span></div></div>
      <div className="lyrics-content"><p className="eyebrow">LYRICS</p><h1>{track.title}</h1><div className="lyrics-scroll">{lines.map(([text,time],i)=><p key={i} ref={i===activeIndex?activeRef:null} className={'lyrics-line '+(i===activeIndex?'active-line ':'')+(i<activeIndex?'past-line':'')} onClick={()=>setProgress((time/(track.duration||222))*100)}>{text}<small>{formatTime(time)}</small></p>)}</div></div>
    </div>
    <div className="lyrics-player"><div className="mini-track"><img src={track.cover}/><div><strong>{track.title}</strong><span>{track.artist}</span></div></div><div className="lyrics-controls"><div><button><SkipBack size={17}/></button><button className="lyrics-play" onClick={()=>setPlaying(!playing)}>{playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button><button><SkipForward size={17}/></button></div><div className="lyrics-progress" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setProgress(((e.clientX-r.left)/r.width)*100)}}><span style={{width:progress+'%'}}/></div><div className="lyrics-time"><span>{formatTime(seconds)}</span><span>{formatTime(track.duration||222)}</span></div></div><div className="lyrics-actions"><button><Heart size={17}/></button><button><Volume2 size={17}/></button></div></div>
  </div>
}
