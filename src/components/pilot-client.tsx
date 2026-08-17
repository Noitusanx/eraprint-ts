"use client";import { useEffect,useState } from "react";import { ResultDisplay } from "./result-display";import { PUBLIC_INITIAL_DECISIONS,type PublicQuestion } from "@/lib/data/public-catalog";import type { Answer,EraPrintResult } from "@/lib/scoring/types";
const ERA_OPTIONS=[{code:"DEBUT",name:"Taylor Swift (Debut)"},{code:"FEARLESS",name:"Fearless"},{code:"SPEAK_NOW",name:"Speak Now"},{code:"RED",name:"Red"},{code:"1989",name:"1989"},{code:"REPUTATION",name:"reputation"},{code:"LOVER",name:"Lover"},{code:"FOLKLORE",name:"folklore"},{code:"EVERMORE",name:"evermore"},{code:"MIDNIGHTS",name:"Midnights"},{code:"TTPD",name:"The Tortured Poets Department"},{code:"SHOWGIRL",name:"The Life of a Showgirl"}] as const;
type ResultPayload={pilotId:string;result:EraPrintResult};
export function PilotClient(){const[answers,setAnswers]=useState<Answer[]>([]);const[question,setQuestion]=useState<PublicQuestion|null>(null);const[result,setResult]=useState<ResultPayload|null>(null);const[error,setError]=useState<string|null>(null);const[busy,setBusy]=useState(false);useEffect(()=>{void load([])},[]);async function load(next:Answer[]){const response=await fetch("/api/pilot/next",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:next})});const body=await response.json() as {question?:PublicQuestion;error?:string};if(!response.ok||!body.question)throw new Error(body.error??"Unable to load pilot question.");setQuestion(body.question)}async function choose(choiceId:string){if(!question||busy)return;setBusy(true);setError(null);const next=[...answers,{questionId:question.id,choiceId}];try{if(next.length===PUBLIC_INITIAL_DECISIONS){const response=await fetch("/api/pilot/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:next})});const body=await response.json() as ResultPayload&{error?:string};if(!response.ok||!body.result)throw new Error(body.error??"Unable to calculate pilot result.");setAnswers(next);setResult(body);}else{await load(next);setAnswers(next);}}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false)}}if(result)return <ResultDisplay result={result.result} shareSource={{type:"answers",answers}} pilotFeedback={<PilotFeedback pilotId={result.pilotId}/>}/>;if(!question)return <main className="game-shell"><section className="game-card"><p>{error??"Loading pilot…"}</p></section></main>;return <main className="game-shell"><section className="game-card"><header className="game-header"><span className="wordmark">EraPrint Pilot</span><span className="step-counter">{answers.length+1}/{PUBLIC_INITIAL_DECISIONS}</span></header><div className="progress-track"><div className="progress-fill" style={{width:`${answers.length/PUBLIC_INITIAL_DECISIONS*100}%`}}/></div><div className="question-stage"><div className="question-meta"><span>{question.category}</span></div><h1 className="question-title">{question.prompt}</h1><div className={`choice-grid ${question.choices.length===2?"choice-grid-two":""}`}>{question.choices.map(choice=><button className="choice-card" type="button" key={choice.id} disabled={busy} onClick={()=>void choose(choice.id)}><span>{choice.label}</span></button>)}</div>{error?<p className="game-error">{error}</p>:<p className="game-hint">Pick instinctively. There is no “right” answer.</p>}</div></section></main>}
function PilotFeedback({pilotId}:{pilotId:string}){
  const[fit,setFit]=useState<number|null>(null);
  const[top,setTop]=useState<boolean|null>(null);
  const[preferred,setPreferred]=useState("");
  const[comment,setComment]=useState("");
  const[state,setState]=useState<"idle"|"saving"|"saved">("idle");
  const[error,setError]=useState<string|null>(null);
  const locked=state!=="idle";

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(fit===null||top===null||locked)return;
    setState("saving");
    setError(null);
    try{
      const response=await fetch("/api/pilot/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pilotId,fitScore:fit,topThreeFit:top,preferredEra:preferred||null,comment})});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error??"Unable to save feedback.");
      setState("saved");
    }catch(error){
      setState("idle");
      setError(error instanceof Error?error.message:"Unable to save feedback.");
    }
  }

  return <section className="result-section pilot-feedback" aria-labelledby="pilot-feedback-heading">
    <p className="eyebrow">PILOT FEEDBACK</p>
    <h2 id="pilot-feedback-heading">Help us understand how this result landed.</h2>
    <form onSubmit={submit}>
      <fieldset disabled={locked}>
        <legend>How much does this EraPrint feel like you?</legend>
        <div className="pilot-scale">
          {[1,2,3,4,5].map(n=><label key={n} className={fit===n?"selected":""}>
            <input type="radio" name="pilot-fit" value={n} checked={fit===n} onChange={()=>setFit(n)}/>
            <span className="pilot-choice-number">{n}</span>
            <span className="pilot-choice-check" aria-hidden="true">✓</span>
          </label>)}
        </div>
        <div className="pilot-scale-labels" aria-hidden="true"><span>Not like me</span><span>Very much like me</span></div>
      </fieldset>

      <fieldset disabled={locked}>
        <legend>Do any of your Primary, Secondary, or Hidden Eras feel like you?</legend>
        <div className="pilot-yes-no">
          {[{label:"Yes",value:true},{label:"No",value:false}].map(option=><label key={option.label} className={top===option.value?"selected":""}>
            <input type="radio" name="pilot-top-three" checked={top===option.value} onChange={()=>setTop(option.value)}/>
            <span>{option.label}</span>
            <span className="pilot-choice-check" aria-hidden="true">✓</span>
          </label>)}
        </div>
      </fieldset>

      {top===false&&<label className="pilot-field" htmlFor="pilot-preferred-era">
        <span>Which Era feels more like you? <small>(optional)</small></span>
        <select id="pilot-preferred-era" value={preferred} disabled={locked} onChange={e=>setPreferred(e.target.value)}>
          <option value="">Choose an Era</option>
          {ERA_OPTIONS.map(e=><option key={e.code} value={e.code}>{e.name}</option>)}
        </select>
      </label>}

      <label className="pilot-field" htmlFor="pilot-comment">
        <span>Anything that felt off? <small>(optional)</small></span>
        <textarea id="pilot-comment" maxLength={500} rows={3} value={comment} disabled={locked} placeholder="Tell us what felt different from you…" onChange={e=>setComment(e.target.value)}/>
      </label>

      <div className="pilot-submit-row">
        <button className="primary-button" type="submit" disabled={fit===null||top===null||locked}>
          {state==="saved"?"Feedback saved ✓":state==="saving"?"Submitting…":"Submit feedback"}
        </button>
        {state==="saved"&&<p className="pilot-success" role="status">Thank you. Your feedback was saved.</p>}
      </div>
      {error&&<p className="game-error" role="alert">{error}</p>}
    </form>
  </section>
}
