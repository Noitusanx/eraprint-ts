# Experimental Era Identity Model

EraPrint keeps its eight public personality signals as the primary description of the user. Four internal signals only describe how that personality tends to be expressed. They are never presented as personality claims and never appear in the public question catalog.

## Internal dimensions

- **Narrative Distance (NAR):** direct/autobiographical at the low pole; fictional, character-based, or narratively distanced at the high pole. This is distinct from Imagination.
- **Emotional Processing (PRO):** analytical/ruminative at the low pole; expressive/cathartic at the high pole. This is distinct from Emotional Intensity.
- **Emotional Stage (STG):** active/unresolved at the low pole; aftermath/resolution at the high pole. This is distinct from Nostalgia.
- **Performance Orientation (PRF):** private/intimate at the low pole; public/performative at the high pole. This is distinct from Social Energy.

The current calibration evaluates a 10% hidden contribution. Public personality therefore remains dominant. Both layers use neutral-centered evidence scoring, prior-weight shrinkage, and reliability-adjusted Era targets. With one ±2 answer a hidden score can only move from 50 to 40/60.

This model is **not enabled in production**. It improved target-profile separation but produced unhealthy question-driven distributions in validation. Production remains on v1.1 while the hidden instrument requires another calibration pass.

## Hidden evidence calibration pass

The second experiment corrected abstract evidence mappings and tested two temporary question variants for performance orientation. The variants replace Q17 with a choice about accepting a visible role and Q29 with a choice about sharing something personally created. They live only in `hidden-question-experiment.ts`; the production/public catalog was restored after the candidate failed its health gate.

Baseline 13-answer evidence was especially weak for NAR (median 2 observations) and structurally low for PRF. PRO leaned analytical and STG slightly leaned toward aftermath. The calibrated experimental selector raised NAR to a median of 5 observations and centered PRO/STG around 50. PRF became semantically cleaner—no longer treating ordinary sociability as performance—but still had only a median of 2 observations at 13 answers.

At 10% hidden weight, target-profile separation remained strong and all 12 Eras were reachable by beam search. Ordinary 30-answer random paths were still unhealthy: TTPD was 0.01% Primary, Showgirl 0%, Debut 33.98%, and Midnights 20.99%. At 15%, Speak Now weakened further and neither TTPD nor Showgirl improved. Therefore neither question variants nor hidden-aware adaptive ranking are enabled in production.

The failure indicates that performance orientation needs more independent scenarios, while TTPD attainability needs a less statistically rare intersection of direct narrative, cathartic processing, and unresolved stage. This should not be solved by increasing weight or making targets more extreme.

## Focused PRF and adaptive-bias pass

This pass adds temporary, diagnostic-only variants for Q03, Q17, Q18, and Q29. Q03 and Q18 provide two independent PRF observations on every experimental initial path; later paths can add Q17, Q27, and Q29. Q18 deliberately has no public personality effects: choosing visibility or privacy in that scenario measures performance orientation, not Social Energy. At 13 answers PRF evidence has a minimum of 2, median of 3, and p90 of 4; its random score range is approximately 25–72. At 30 answers the median evidence count is 5 and the observed range is approximately 22–78.

Hidden-aware uncertainty ranking was rejected. Even after removing direct top-Era feedback, prioritizing hidden deficits materially changed the public question mix and raised Midnights to roughly 30% in the initial simulation. The experimental path now schedules the balanced Q18 scenario once immediately after the five anchors, then uses the unchanged public adaptive ranking. Midnights fell to 22.02% in the final 10,000-run 13-answer simulation. Hidden evidence therefore observes the path but—apart from one universal balanced measurement slot—does not adaptively steer it.

At 10%, directed beam search still finds all 12 Eras. TTPD produces 296 winning candidates out of a 300-wide final beam and a best blend near 39%; Showgirl produces 300 and a best blend near 67%. Their local target neighborhoods remain robust. Ordinary random paths are still rare, however: in the final 10,000-run comparison TTPD was 0.14%/0.01% Primary at 13/30 and Showgirl 0.51%/0%. Because this focused pass improved measurement and removed adaptive steering but did not resolve ordinary attainability, the model remains experimental and is not activated in production.

For a future consented pilot, `npm run pilot:hidden-model` reads an answer array from standard input and prints only the eight public scores, four hidden scores, the three leading Eras, Era Blend percentages, and answer count. It does not persist input, echo answers, or output hidden effects/weights or personal identifiers.

## Reference grounding

The identity interpretation follows Taylor Swift's album framing where available and the supporting sources reviewed during the identity audit:

- Recording Academy's era guide and its accounts of Debut's diaristic country writing, Fearless's fairytale idealism, Speak Now's self-authored voice, 1989's reinvention, reputation's guarded public conflict, and Lover's move into light and relational complexity: https://qa.grammy.com/news/taylor-swift-albums-guide-eras-discography
- Recording Academy on Speak Now as speaking up and speaking her truth: https://www.grammy.com/news/taylor-swift-speak-now-taylors-version-legacy-songs-mine-dear-john-mean/
- Taylor's distinction between folklore's reconciliation and evermore's endings/aftermath, reported by TIME: https://time.com/5920105/taylor-swift-evermore/
- Taylor's framing of Midnights as sleepless nights across her life and the Recording Academy's self-awareness/self-doubt reading: https://www.axios.com/local/nashville/2022/08/30/taylor-swift-midnights-album and https://www.grammy.com/news/taylor-swift-midnights-new-album-takeaways-songs-anti-hero-lavender-haze-reputation-lover-tiktok-3am-tracks-edition/
- Taylor's TTPD release statement describing a sensational, sorrowful, fatalistic chapter and writing as release: https://www.theatlantic.com/culture/archive/2024/04/taylor-swift-tortured-poets-department-autofiction/678170/
- AP's account of The Life of a Showgirl as inner life behind the Eras Tour and its public, up-tempo performance framing: https://apnews.com/article/ee01eff74472cecc05a8f46076af0c6d and https://apnews.com/article/d2681b9f07592d96f336ef7e8438ef74

## Era identity matrix

| Era | Public personality shape | Internal identity shape | Nearest competitors and distinction |
| --- | --- | --- | --- |
| Debut | romantic, reflective, open, moderately social | direct, expressive, still inside formative experiences, modestly public | Fearless is more fairytale-distanced and performative. |
| Fearless | highly romantic and imaginative, open, socially bright | mildly narrative, expressive, between active experience and hindsight, outward | Debut is more concrete/direct; Lover is more resolved and intimate. |
| Speak Now | assertive, emotional, reflective, romantic | direct, strongly cathartic, unresolved, visibly expressive | Red is more raw and less declarative; Midnights is analytical/private. |
| Red | maximally emotional and nostalgic, reflective and exposed | most autobiographical, expressive, actively unresolved, moderately public | Speak Now emphasizes saying it; TTPD turns crisis into deliberate catharsis. |
| 1989 | independent, social, future-facing, composed | direct, moderately expressive, post-reinvention, highly public | Showgirl is maximally performative; reputation is more guarded and embattled. |
| reputation | assertive, intense, highly guarded | direct, cathartic, mid-transition, public persona protecting private life | 1989 is less defensive; Showgirl is triumphant rather than armored. |
| Lover | romantic, open, social, softly reflective | direct/intimate, expressive, resolved, relational rather than stage-led | Showgirl turns expression into spectacle; Fearless is younger and less settled. |
| folklore | imaginative, introspective, private, nostalgic | highly character-based, contemplative, partly resolved, intimate | evermore concentrates on endings; TTPD is direct and cathartic. |
| evermore | imaginative, introspective, private, more guarded | narratively distanced, heavier expression, aftermath/resolution, intimate | folklore leaves more possibility; TTPD remains personally immediate and active. |
| Midnights | introspective, emotional, nostalgic, guarded | direct, maximally analytical/ruminative, between active memory and hindsight, private | TTPD needs release; Speak Now speaks outward. |
| TTPD | maximally emotional, nostalgic and introspective | autobiographical, maximally cathartic, active/fatalistic, publicly authored | Midnights analyzes; evermore narrates aftermath; Red lacks the literary release frame. |
| Showgirl | assertive, social, romantic, open | direct, expressive, resolved/triumphant, maximally performative | Lover is intimate; 1989 is polished reinvention rather than life on stage. |

## Question evidence policy

The experiment attaches hidden effects only to behavioral choices already visible to the user. Examples include saying everything versus taking time to think (PRO), keeping an experience active versus moving forward (STG), reshaping something into a story (NAR), and preferring an intimate setting versus making a visible moment (PRF). No choice awards or removes a named Era.

The public wording and eight public effects retain their v1.1 meanings. The diagnostic can evaluate hidden matching independently without changing production adaptive ranking.

## Compatibility

Snapshots persist their computed blend and scoring version. Because the candidate failed its production-health gate, no new scoring version is activated. Existing EraPrint, EraMatch, Circle, refinement, and public result behavior remain on v1.1. Clarity remains calculated exclusively from the eight public personality signals.
