#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const issuePath = 'qc-evidence/fix-agent-issue.json';
if (!fs.existsSync(issuePath)) throw new Error('Fix Agent issue contract is missing.');
const issue = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
const endpoint = process.env.FIX_AGENT_LLM_ENDPOINT;
const apiKey = process.env.FIX_AGENT_LLM_API_KEY;
const model = process.env.FIX_AGENT_LLM_MODEL;
if (!endpoint || !apiKey || !model) throw new Error('Fix Agent AI provider is not configured. Set FIX_AGENT_LLM_ENDPOINT, FIX_AGENT_LLM_API_KEY and FIX_AGENT_LLM_MODEL as Actions secrets/variables.');

const words = `${issue.title} ${issue.body}`.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || [];
const stop = new Set(['this','that','with','from','agent','issue','https','github','cvideo','expected','actual','severity','signature','evidence','repair','browser']);
const terms = [...new Set(words.filter((w) => !stop.has(w)))].slice(0, 12);
let candidates = [];
for (const term of terms) {
  try {
    const hits = execFileSync('git', ['grep','-l','-i','--',term,'apps','tests','scripts'], { encoding:'utf8', maxBuffer:1024*1024 }).trim().split('\n').filter(Boolean);
    candidates.push(...hits);
  } catch {}
}
candidates = [...new Set(candidates)].filter((p) => !p.startsWith('qc-evidence/')).slice(0, 18);
const files = candidates.map((path) => {
  try { return { path, content: fs.readFileSync(path,'utf8').slice(0,16000) }; } catch { return null; }
}).filter(Boolean);
const prompt = `You are the CVIDEO Fix Agent. Repair exactly one verified QC defect.\n\nHARD RULES:\n- Return JSON only with keys rationale, patch, regressionTest, confidence.\n- patch must be a unified git diff applicable with git apply.\n- Make the smallest safe change.\n- Add or strengthen a regression test.\n- Never edit Factory/QC controls, workflows, secrets, auth/tenant protections merely to make tests pass.\n- Never delete or weaken the failing assertion.\n- If evidence is insufficient, return an empty patch and explain why.\n\nDEFECT:\n${JSON.stringify(issue,null,2)}\n\nRELEVANT REPOSITORY FILES:\n${files.map((f)=>`--- ${f.path} ---\n${f.content}`).join('\n\n')}`;
const response = await fetch(endpoint, { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${apiKey}` }, body:JSON.stringify({ model, messages:[{role:'user',content:prompt}], temperature:0.1, response_format:{type:'json_object'} }) });
if (!response.ok) throw new Error(`Fix Agent model request failed: ${response.status} ${await response.text()}`);
const payload = await response.json();
const raw = payload.choices?.[0]?.message?.content;
if (!raw) throw new Error('Fix Agent model returned no content.');
const result = JSON.parse(raw);
if (!result.patch?.trim()) throw new Error(`Fix Agent declined to patch: ${result.rationale || 'insufficient evidence'}`);
fs.writeFileSync('qc-evidence/fix-agent-brain.json', JSON.stringify({ model, rationale:result.rationale, regressionTest:result.regressionTest, confidence:result.confidence, consideredFiles:candidates, generatedAt:new Date().toISOString() }, null, 2));
fs.writeFileSync('qc-evidence/fix-agent.patch', result.patch);
execFileSync('git',['apply','--check','qc-evidence/fix-agent.patch'],{stdio:'inherit'});
execFileSync('git',['apply','qc-evidence/fix-agent.patch'],{stdio:'inherit'});
console.log(JSON.stringify({ state:'PATCH_GENERATED', model, filesConsidered:candidates.length, rationale:result.rationale, regressionTest:result.regressionTest, confidence:result.confidence }, null, 2));
