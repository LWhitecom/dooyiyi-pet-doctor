import { useEffect, useState } from 'react'
import '../styles/progress.css'
const ids=['hero','about','gallery','finale'];
function PawProgress(){const [active,setActive]=useState(0);useEffect(()=>{const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setActive(ids.indexOf(e.target.id))}),{threshold:.45});ids.forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el)});return()=>obs.disconnect()},[]);return <nav className="paw-progress" aria-label="页面进度">{ids.map((id,i)=><button key={id} className={i===active?'active':''} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'})} aria-label={`前往第 ${i+1} 页`}>🐾</button>)}</nav>}
export default PawProgress
