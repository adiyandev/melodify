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

const AUDIUS_API='https://api.audius.co/v1'
const AUDIUS_APP_URL='https://audius.co'

function mapAudiusTrack(t){
  return {id:String(t.id),title:t.title||'Unknown track',artist:t.user?.name||'Unknown artist',duration:Number(t.duration)||0,cover:t.artwork?._480x480||t.artwork?._1000x1000||t.artwork?._150x150||'',album:t.playlist_name||'Single',uri:String(t.id),audiusUrl:t.permalink?('https://audius.co'+t.permalink):AUDIUS_APP_URL,streamUrl:t.isStreamable==='false'||t.isStreamable===false?'':AUDIUS_API+'/tracks/'+encodeURIComponent(t.id)+'/stream',lyrics:[]}
}
async function audiusFetch(path,options={}){
  const res=await fetch(AUDIUS_API+path,options)
  if(!res.ok){let message='Audius request failed.';try{message=(await res.json()).message||message}catch{}throw new Error(message)}
  return res.json()
}
async function searchMusic(query){
  const data=await audiusFetch('/tracks/search?'+new URLSearchParams({query:query.trim(),limit:'10',sort_method:'relevant'}))
  return (data.data||[]).filter(t=>t.isStreamable!==false&&t.isStreamable!=='false').map(mapAudiusTrack)
}
async function getFeaturedMusic(){
  const data=await audiusFetch('/tracks/trending?'+new URLSearchParams({limit:'20',time:'week'}))
  return (data.data||[]).filter(t=>t.isStreamable!==false&&t.isStreamable!=='false').map(mapAudiusTrack)
}

function loadPlaylists(){try{return JSON.parse(localStorage.getItem('melodify-playlists')||'[]')}catch{return []}}

function App(){
  const [page,setPage]=useState('home')
  const [tracks,setTracks]=useState([])
  const [active,setActive]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [lyricsPage,setLyricsPage]=useState(false)
  const [progress,setProgress]=useState(0)
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
  const [spotifyToken,setSpotifyToken]=useState(getStoredToken)
  const [spotifyReady,setSpotifyReady]=useState(false)
  const [spotifyError,setSpotifyError]=useState('')
  const [spotifyMarket,setSpotifyMarket]=useState('')
  const playerRef=useRef(null)
  const deviceIdRef=useRef(null)
  const track=remoteTrack||tracks[active]||  const track=remoteTrack||tracks[active]||null

  useEffect(()=>{localStorage.setItem('melodify-playlists',JSON.stringify(playlists))},[playlists])

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    const code=params.get('code');const state=params.get('state');const error=params.get('error')
    if(error){setSpotifyError('Spotify authorization was cancelled.');return}
    if(!code)return
    spotifyTokenFromCode(code,state).then(token=>{setSpotifyToken(token);window.history.replaceState({},'',SPOTIFY_REDIRECT_URI)}).catch(e=>setSpotifyError(e.message))
  },[])

  useEffect(()=>{
    if(!spotifyToken)return
    spotifyFetch('/me').then(profile=>{
      const market=profile?.country||''
      setSpotifyMarket(market)
      return getFeaturedMusic(market)
    }).then(setTracks).catch(e=>setSpotifyError(e.message))
  },[spotifyToken])

  useEffect(()=>{
    if(!spotifyToken)return
    const script=document.createElement('script')
    script.src='https://sdk.scdn.co/spotify-player.js'
    script.async=true
    window.onSpotifyWebPlaybackSDKReady=()=>{
      const player=new window.Spotify.Player({name:'Melodify Web Player',volume,enableMediaSession:true,getOAuthToken:cb=>cb(getStoredToken()||spotifyToken)})
      player.addListener('ready',({device_id})=>{deviceIdRef.current=device_id;setSpotifyReady(true)})
      player.addListener('not_ready',()=>setSpotifyReady(false))
      player.addListener('authentication_error',({message})=>setSpotifyError(message))
      player.addListener('account_error',({message})=>setSpotifyError(message||'Spotify Premium is required for Web Playback.'))
      player.addListener('playback_error',({message})=>setSpotifyError(message))
      player.addListener('player_state_changed',state=>{if(!state)return;setPlaying(!state.paused);setProgress(state.duration?state.position/state.duration*100:0)})
      player.connect().catch(()=>setSpotifyReady(false))
      playerRef.current=player
    }
    document.body.appendChild(script)
    return()=>{playerRef.current?.disconnect();playerRef.current=null;script.remove();window.onSpotifyWebPlaybackSDKReady=null}
  },[spotifyToken])

  useEffect(()=>{playerRef.current?.setVolume(volume)},[volume])

  useEffect(()=>{if(!spotifyToken||page!=='search'||search.trim().length<2){setMusicResults([]);setSearchError('');return}const timer=setTimeout(async()=>{setSearching(true);try{const results=await searchMusic(search,spotifyMarket);setMusicResults(results);setSearchError(results.length?'':`Spotify returned 0 tracks for “${search.trim()}”.`)}catch(e){setSearchError(e.message)}finally{setSearching(false)}},450);return()=>clearTimeout(timer)},[search,page,spotifyToken,spotifyMarket])

  const audioRef=useRef(null)
  const playAudiusTrack=async t=>{
    if(!t?.streamUrl){setSpotifyError('This Audius track is not streamable.');return}
    try{
      if(audioRef.current){audioRef.current.pause();audioRef.current.src=t.streamUrl;audioRef.current.volume=volume;await audioRef.current.play()}
      setRemoteTrack(t);setPlaying(true);setProgress(0);setSpotifyError('')
    }catch(e){setSpotifyError(e.message||'Unable to start playback.')}
  }
  const togglePlayback=async()=>{if(!audioRef.current)return;try{if(audioRef.current.paused)await audioRef.current.play();else audioRef.current.pause()}catch(e){setSpotifyError(e.message||'Unable to control playback.')}}
  const playTrack=async i=>{if(!tracks[i])return;setActive(i);setRemoteTrack(null);await playAudiusTrack(tracks[i])}
  const playMusicTrack=async t=>{await playAudiusTrack(t)}
  const nextTrack=()=>{const list=remoteTrack?[remoteTrack,...tracks.filter(t=>t.id!==remoteTrack.id)]:tracks;const i=list.findIndex(t=>t.id===track?.id);if(i>=0&&i+1<list.length)playAudiusTrack(list[i+1])}
  const prevTrack=()=>{const list=remoteTrack?[remoteTrack,...tracks.filter(t=>t.id!==remoteTrack.id)]:tracks;const i=list.findIndex(t=>t.id===track?.id);if(i>0)playAudiusTrack(list[i-1])}
  const addToPlaylist=(playlistId,t)=>{setPlaylists(v=>v.map(p=>p.id===playlistId?{...p,tracks:p.tracks.some(x=>x.id===t.id)?p.tracks:[...p.tracks,t]}:p))}
  const currentSeconds=(track?.duration||0)*(progress/100)
  const formatTime=seconds=>{const s=Math.floor(seconds||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}

  useEffect(()=>{const a=audioRef.current;if(!a)return;const onTime=()=>setProgress(a.duration?(a.currentTime/a.duration)*100:0);const onEnd=()=>{setPlaying(false);setProgress(100)};a.addEventListener('timeupdate',onTime);a.addEventListener('ended',onEnd);a.addEventListener('play',()=>setPlaying(true));a.addEventListener('pause',()=>setPlaying(false));return()=>{a.removeEventListener('timeupdate',onTime);a.removeEventListener('ended',onEnd)}},[])
  useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume},[volume])

  return <div className="app">
    <aside className={"sidebar "+(sidebarOpen?"sidebar-open":"sidebar-collapsed")}>
      <div className="brand"><span className="brand-mark">M</span><span>Melodify</span></div>
      <nav>{['home','search','library'].map(key=>{const P=pages[key];return <button key={key} className={'nav-item '+(page===key?'active':'')} onClick={()=>setPage(key)}><P.icon size={18}/><span>{P.label}</span></button>})}</nav>
      <div className="side-section"><p>YOUR MUSIC</p>{['liked','playlists','history'].map(key=>{const P=pages[key];return <button key={key} className={'nav-item '+(page===key?'active':'')} onClick={()=>setPage(key)}><P.icon size={17}/><span>{P.label}</span></button>})}</div>
      <div className="side-section radio-link"><button className={'nav-item '+(page==='radio'?'active':'')} onClick={()=>setPage('radio')}><Radio size={17}/><span>Radio</span></button></div>
      <div className="sidebar-bottom"><span>Ad-free listening</span><small>Melodify • 2026</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="topbar-left"><button className="sidebar-toggle" onClick={()=>setSidebarOpen(v=>!v)} title="Toggle sidebar">{sidebarOpen?<PanelLeftClose size={17}/>:<PanelRight size={17}/>}</button><div className="arrows"><button><ChevronLeft/></button><button><ChevronRight/></button></div></div><div className="profile"><User size={16}/></div></header>
      {spotifyError&&<div className="spotify-banner"><span>{spotifyError}</span><button onClick={()=>setSpotifyError('')}>×</button></div>}
      {!spotifyToken&&<div className="spotify-connect"><div><strong>Connect Spotify</strong><span>Sign in with Spotify to search and stream music in Melodify.</span></div><button onClick={()=>spotifyLogin()}>Connect</button></div>}
      {page==='home' && <HomePage tracks={tracks} playTrack={playTrack} setPage={setPage}/>}
      {page==='search' && <SearchPage search={search} setSearch={setSearch} tracks={tracks} playTrack={playTrack} musicResults={musicResults} searching={searching} searchError={searchError} playMusicTrack={playMusicTrack} playlists={playlists} addToPlaylist={addToPlaylist}/>}
      {page==='library' && <LibraryPage tracks={tracks} playTrack={playTrack}/>}
      {page==='liked' && <CollectionPage title="Liked Songs" subtitle="Your favorite tracks in one place." icon={Heart} tracks={tracks.slice(0,4)} playTrack={playTrack}/>}
      {page==='playlists' && <PlaylistsPage playlists={playlists} setPlaylists={setPlaylists} tracks={tracks} playTrack={playTrack} playMusicTrack={playMusicTrack} selectedPlaylist={selectedPlaylist} setSelectedPlaylist={setSelectedPlaylist} playlistEditor={playlistEditor} setPlaylistEditor={setPlaylistEditor}/>}
      {page==='history' && <CollectionPage title="Recently Played" subtitle="Pick up where you left off." icon={Clock3} tracks={tracks.slice().reverse()} playTrack={playTrack}/>}
      {page==='radio' && <RadioPage tracks={tracks} playTrack={playTrack}/>}
      {lyricsPage&&track&&<LyricsPage sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} track={track} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} close={()=>setLyricsPage(false)} formatTime={formatTime}/>}
    </main>

    {artistPanelOpen&&track&&<ArtistSidebar track={track} tracks={tracks} playTrack={playTrack} active={active} close={()=>setArtistPanelOpen(false)}/>}
    {track&&<div className="now-playing">
      <div className="apple-player-track"><div className={'disc '+(playing?'spinning':'')}><img src={track.cover}/><span/></div><div className="apple-track-meta"><strong>{track.title}</strong><span>{track.artist}</span></div><button className="apple-like"><Heart size={16}/></button></div>
      <div className="apple-player-center"><div className="apple-control-row"><button onClick={prevTrack}><SkipBack fill="currentColor"/></button><button className="apple-play" onClick={togglePlayback}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={nextTrack}><SkipForward fill="currentColor"/></button></div><div className="apple-progress-row"><span>{formatTime(currentSeconds)}</span><div className="progress"><span style={{width:progress+'%'}}/></div><span>{formatTime(track.duration)}</span></div></div>
      <div className="apple-player-actions"><button className={'lyrics '+(lyricsPage?'active':'')} onClick={()=>setLyricsPage(true)}><Music2 size={16}/><span>Lyrics</span></button><label className="volume-control"><Volume2 size={17}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button onClick={()=>setArtistPanelOpen(v=>!v)} className={artistPanelOpen?'panel-active':''}><PanelRight size={16}/></button><button><Maximize2 size={16}/></button></div>
    </div>}
  </div>
}

function ArtistSidebar({track,tracks,playTrack,active,close}){return <aside className="artist-sidebar"><div className="artist-sidebar-head"><span>NOW PLAYING</span><button onClick={close}><X size={16}/></button></div><div className="artist-feature"><img src={track.cover}/><div><strong>{track.artist}</strong><span>Artist</span></div><button className="follow-btn">Follow</button></div><div className="artist-section"><div className="artist-section-head"><h3>About the artist</h3><button>More</button></div><p>Melodify artists bring late-night sounds, neon moods and songs made for uninterrupted listening.</p></div><div className="artist-section"><h3>Popular</h3>{tracks.slice(0,4).map((t,i)=><button className={'artist-track '+(i===active?'current':'')} key={t.id} onClick={()=>playTrack(i)}><img src={t.cover}/><span><strong>{t.title}</strong><small>{t.artist}</small></span><Play size={14} fill="currentColor"/></button>)}</div></aside>}

function HomePage({tracks,playTrack,setPage}){return <section className="page"><section className="hero"><div><p className="eyebrow">GOOD AFTERNOON</p><h1>Made for your mood.</h1><p className="sub">Your music, uninterrupted.</p></div><button className="circle-btn" onClick={()=>playTrack(0)} disabled={!tracks.length}><Play fill="currentColor"/></button></section><Section title="Made for you" action="Show all" onAction={()=>setPage('library')}><div className="cards">{tracks.slice(0,4).map((t,i)=><TrackCard key={t.id} t={t} i={i} playTrack={playTrack}/>)}</div></Section><Section title="Recently played"><div className="recent">{tracks.slice(0,5).map((t,i)=><RecentRow key={t.id} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>}

function SearchPage({search,setSearch,tracks,playTrack,musicResults,searching,searchError,playMusicTrack,playlists,addToPlaylist}){return <section className="page"><div className="page-title"><p className="eyebrow">DISCOVER</p><h1>Search</h1><div className="search-box"><Search size={18}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search songs, artists or albums"/></div></div>{search.trim().length>=2?<Section title="Audius catalog"><div className="recent">{searching?<div className="search-status">Searching Spotify…</div>:searchError?<div className="search-status">{searchError}</div>:musicResults.length?musicResults.map(t=><div className="recent-row catalog-row" key={t.id}><button className="catalog-main" onClick={()=>playMusicTrack(t)}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist} · {t.album}</span></div><Play size={16} fill="currentColor"/></button><select aria-label={"Add "+t.title+" to playlist"} defaultValue="" onChange={e=>{if(e.target.value){addToPlaylist(e.target.value,t);e.target.value=''}}}><option value="">＋</option>{playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>):<div className="search-status">No Audius results found.</div>}</div></Section>:<Section title="Trending on Audius"><div className="cards">{tracks.map((t,i)=><TrackCard key={t.id} t={t} i={i} playTrack={playTrack}/>)}</div></Section>}</section>}

function LibraryPage({tracks,playTrack}){return <section className="page"><div className="page-title"><p className="eyebrow">COLLECTION</p><h1>Your Library</h1><p className="sub">Everything you keep close.</p></div><Section title="Saved music"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.id} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>}

function CollectionPage({title,subtitle,icon:Icon,tracks,playTrack}){return <section className="page"><div className="collection-hero"><div className="collection-icon"><Icon/></div><div><p className="eyebrow">YOUR MUSIC</p><h1>{title}</h1><p className="sub">{subtitle}</p></div></div><Section title="Tracks"><div className="recent">{tracks.map((t,i)=><RecentRow key={t.id} t={t} onClick={()=>playTrack(i)}/>)}</div></Section></section>}

function PlaylistsPage({playlists,setPlaylists,tracks,playTrack,playMusicTrack,selectedPlaylist,setSelectedPlaylist,playlistEditor,setPlaylistEditor}){const create=()=>{const p={id:Date.now().toString(),name:'New Playlist',description:'',tracks:[]};setPlaylists(v=>[...v,p]);setPlaylistEditor(p)};const update=patch=>{setPlaylists(v=>v.map(p=>p.id===playlistEditor.id?{...p,...patch}:p));setPlaylistEditor(p=>({...p,...patch}))};const remove=id=>{setPlaylists(v=>v.filter(p=>p.id!==id));setSelectedPlaylist(null);setPlaylistEditor(null)};if(selectedPlaylist){const p=playlists.find(x=>x.id===selectedPlaylist.id)||selectedPlaylist;return <section className="page"><button className="back-link" onClick={()=>setSelectedPlaylist(null)}>← All playlists</button><div className="playlist-detail"><div className="playlist-detail-cover"><img src={p.tracks[0]?.cover||tracks[0]?.cover}/></div><div><p className="eyebrow">PLAYLIST</p><h1>{p.name}</h1><p className="sub">{p.description||'Your personal collection.'}</p><div className="playlist-detail-actions"><button onClick={()=>setPlaylistEditor(p)}>Edit playlist</button><button className="danger" onClick={()=>remove(p.id)}>Delete</button></div></div></div><Section title={p.tracks.length+' tracks'}><div className="recent">{p.tracks.map(t=><button className="recent-row" key={t.id} onClick={()=>playMusicTrack(t)}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={16} fill="currentColor"/></button>)}{!p.tracks.length&&<div className="search-status">This playlist is empty.</div>}</div></Section></section>}return <section className="page"><div className="page-title playlist-heading"><div><p className="eyebrow">YOUR MUSIC</p><h1>Playlists</h1></div><button className="create-playlist" onClick={create}>+ New playlist</button></div><div className="playlist-grid">{playlists.map(p=><button className="playlist-card" key={p.id} onClick={()=>setSelectedPlaylist(p)}><img src={p.tracks[0]?.cover||tracks[0]?.cover}/><div><strong>{p.name}</strong><span>{p.tracks.length} tracks</span></div><Play size={18} fill="currentColor"/></button>)}{!playlists.length&&<div className="empty-playlists">No playlists yet. Create your first one.</div>}</div>{playlistEditor&&<div className="modal-backdrop" onClick={()=>setPlaylistEditor(null)}><div className="playlist-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Edit playlist</h2><button onClick={()=>setPlaylistEditor(null)}>×</button></div><label>Name<input value={playlistEditor.name} onChange={e=>update({name:e.target.value})}/></label><label>Description<textarea value={playlistEditor.description} onChange={e=>update({description:e.target.value})}/></label><div className="modal-actions"><button onClick={()=>setPlaylistEditor(null)}>Done</button></div></div></div>}</section>}

function RadioPage({tracks,playTrack}){return <section className="page"><div className="radio-hero"><div><p className="eyebrow">MUSIC WITHOUT THE WORK</p><h1>Melodify Radio</h1><p className="sub">Endless mixes built around your mood.</p></div><button className="circle-btn" onClick={()=>tracks[2]&&playTrack(2)} disabled={!tracks.length}><Play fill="currentColor"/></button></div><Section title="Stations"><div className="cards">{tracks.slice(1,5).map((t,i)=><TrackCard key={t.id} t={t} i={i+1} playTrack={playTrack}/>)}</div></Section></section>}

function Section({title,action,onAction,children}){return <section className="content-section"><div className="section-head"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}</button>}</div>{children}</section>}
function TrackCard({t,i,playTrack}){return <button className="track-card" onClick={()=>playTrack(i)}><img src={t.cover}/><strong>{t.title}</strong><span>{t.artist}</span><span className="card-play"><Play size={15} fill="currentColor"/></span></button>}
function RecentRow({t,onClick}){return <button className="recent-row" onClick={onClick}><img src={t.cover}/><div><strong>{t.title}</strong><span>{t.artist}</span></div><Play size={16} fill="currentColor"/></button>}

function LyricsPage({sidebarOpen,setSidebarOpen,track,playing,setPlaying,progress,setProgress,close,formatTime}){
  const activeRef=useRef(null)
  const seconds=(progress/100)*(track.duration||222)
  const lines=track.lyrics||[]
  let activeIndex=-1
  lines.forEach((line,i)=>{if(seconds>=line[1])activeIndex=i})
  useEffect(()=>{activeRef.current?.scrollIntoView({behavior:'smooth',block:'center'})},[activeIndex])
  return <div className="lyrics-page">
    <header className="lyrics-page-top"><button className="lyrics-back" onClick={close}><ChevronLeft size={19}/><span>Back</span></button><div className="lyrics-label">NOW PLAYING</div><button className="lyrics-more" onClick={()=>setSidebarOpen(v=>!v)}><PanelLeftClose size={17}/></button></header>
    <div className="lyrics-layout"><div className="lyrics-art-wrap"><div className="lyrics-art"><img src={track.cover}/></div><div className="lyrics-track"><strong>{track.title}</strong><span>{track.artist}</span></div></div><div className="lyrics-content"><p className="eyebrow">LYRICS</p><h1>{track.title}</h1><div className="lyrics-scroll">{lines.map(([text,time],i)=><p key={i} ref={i===activeIndex?activeRef:null} className={'lyrics-line '+(i===activeIndex?'active-line ':'')+(i<activeIndex?'past-line':'')} onClick={()=>setProgress((time/(track.duration||222))*100)}>{text}<small>{formatTime(time)}</small></p>)}</div></div></div>
    <div className="lyrics-player"><div className="mini-track"><img src={track.cover}/><div><strong>{track.title}</strong><span>{track.artist}</span></div></div><div className="lyrics-controls"><div><button><SkipBack size={17}/></button><button className="lyrics-play" onClick={()=>setPlaying(!playing)}>{playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button><button><SkipForward size={17}/></button></div><div className="lyrics-progress"><span style={{width:progress+'%'}}/></div><div className="lyrics-time"><span>{formatTime(seconds)}</span><span>{formatTime(track.duration)}</span></div></div><div className="lyrics-actions"><button><Heart size={17}/></button><button><Volume2 size={17}/></button></div></div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
