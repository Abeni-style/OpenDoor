/* OpenDoor browser integrations. Only public Supabase URL/anon key belong in backend-config.js. */
(() => {
  const cfg = window.OPENDOOR_CONFIG || {};
  const ready = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_URL).includes('YOUR_PROJECT'));
  const base = String(cfg.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = cfg.SUPABASE_ANON_KEY || '';
  const fn = name => `${base}/functions/v1/${name}`;
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let session = null, history = [], assistantBusy = false;

  try { session = JSON.parse(sessionStorage.getItem('od.auth.session') || 'null'); } catch { session = null; }
  function saveSession(s) { session = s; if (s) sessionStorage.setItem('od.auth.session', JSON.stringify(s)); else sessionStorage.removeItem('od.auth.session'); }
  function accessToken() { return session?.access_token || anon; }
  async function ensureValidSession() {
    if (!session?.access_token) return null;
    const expiresAt = Number(session.expires_at || 0);
    if (!expiresAt || expiresAt * 1000 > Date.now() + 60_000) return session.access_token;
    if (!session.refresh_token || !ready) { saveSession(null); refreshAccountButton?.(); return null; }
    const response = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, { method:'POST', headers:{ apikey:anon, Authorization:`Bearer ${anon}`, 'Content-Type':'application/json' }, body:JSON.stringify({ refresh_token:session.refresh_token }) });
    const data = await response.json().catch(()=>({}));
    if (!response.ok || !data.access_token) { saveSession(null); return null; }
    if (!data.expires_at && data.expires_in) data.expires_at = Math.floor(Date.now()/1000) + Number(data.expires_in);
    saveSession(data); return data.access_token;
  }
  async function functionCall(name, payload, extraHeaders={}) {
    if (!ready) throw new Error('Backend is not connected yet. Add the public Supabase URL and anon key in backend-config.js.');
    const token = await ensureValidSession() || anon;
    const response = await fetch(fn(name), { method:'POST', headers:{ apikey:anon, Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...extraHeaders }, body:JSON.stringify(payload) });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || `Service unavailable (${response.status})`);
    return data;
  }
  function toast(msg) { const t=$('#toast'); if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200);} }

  // Assistant UI
  const root = $('#odAssistantRoot');
  if (root) root.innerHTML = `
    <button class="od-chat-launch" id="odChatLaunch" aria-label="Open OpenDoor Guide"><span class="od-chat-spark">✦</span><span>Ask OpenDoor</span></button>
    <section class="od-chat-panel" id="odChatPanel" aria-label="OpenDoor student assistant" hidden>
      <header class="od-chat-head"><div><span class="od-chat-orb">✦</span><div><b>OpenDoor Guide</b><small>${ready ? 'Connected AI service' : 'Local guide · AI service not connected'}</small></div></div><button id="odChatClose" aria-label="Close assistant">×</button></header>
      <div class="od-chat-notice">AI-generated guidance can be wrong. Verify current eligibility, deadlines and funding on official provider websites. Do not share personal or sensitive information.</div>
      <div class="od-chat-quick"><button type="button" data-od-prompt="How do I find opportunities that fit my age and country?">Find opportunities</button><button type="button" data-od-prompt="Explain fully funded versus partially funded programs.">Understand funding</button><button type="button" data-od-prompt="Help me prepare an application checklist.">Prepare an application</button></div><div class="od-chat-messages" id="odChatMessages"><div class="od-chat-msg bot">Hello. I can help you navigate OpenDoor, understand opportunity information and plan your next steps. What do you need help with?</div></div>
      <form id="odChatForm" class="od-chat-form"><textarea id="odChatInput" rows="2" maxlength="3000" placeholder="Ask a question…" required></textarea><button id="odChatSend" type="submit" aria-label="Send message">↑</button></form>
      <div class="od-chat-foot">This website does not save chat history. Messages are sent to the configured AI provider when connected. Avoid sharing personal details.</div>
    </section>`;
  $('#odChatLaunch')?.addEventListener('click',()=>{const p=$('#odChatPanel');p.hidden=!p.hidden;$('#odChatInput')?.focus();});
  $('#odChatClose')?.addEventListener('click',()=>$('#odChatPanel').hidden=true);
  $('#odAssistantRoot')?.addEventListener('click',event=>{const chip=event.target.closest('[data-od-prompt]');if(!chip)return;$('#odChatInput').value=chip.dataset.odPrompt;$('#odChatForm')?.requestSubmit();});
  function appendMessage(role, text) { const box=document.createElement('div');box.className=`od-chat-msg ${role}`;box.textContent=text;$('#odChatMessages').append(box);$('#odChatMessages').scrollTop=$('#odChatMessages').scrollHeight; }
  function localGuideReply(message) {
    const q=String(message||'').toLowerCase();
    const catalog=window.OD_DATA?.opportunities||[];
    const verified=catalog.filter(o=>o.verificationStatus==='verified'&&o.cloudVerified===true);
    const linkFor=o=>o.url?`Official source: ${o.url}`:'No official source link is recorded.';
    if(/scholarship|opportunit|program|programme|internship|summer|fellowship|competition|research|grant/.test(q)){
      const terms=q.split(/[^a-z0-9]+/).filter(w=>w.length>3);
      const hits=catalog.filter(o=>terms.some(w=>`${o.title} ${o.provider} ${o.category} ${o.description}`.toLowerCase().includes(w))).slice(0,4);
      if(hits.length){return `I found ${hits.length} related catalogue record(s). These are discovery leads, not necessarily currently open or verified:\n\n${hits.map(o=>`• ${o.title} — ${o.provider}. Status: ${o.verificationStatus||'pending review'}. ${linkFor(o)}`).join('\n\n')}\n\nCheck each organizer's current cycle, age, country, deadline, fees and funding before applying. The catalogue is a starter directory, not a complete list of worldwide opportunities.`;}
      return `To find suitable opportunities, use the Opportunity Explorer and filter by category, country, age, grade and funding. Start with official provider websites. The current local catalogue has ${catalog.length} provider/program discovery records, but it is not exhaustive and most entries still need cycle verification. I cannot confirm live openings or deadlines while the live data service is disconnected.`;
    }
    if(/fully funded|funding|fee|cost|tuition|stipend/.test(q)) return 'Check exactly what the provider covers. “Fully funded” should specify whether tuition, travel, accommodation, meals, insurance and visa costs are covered. “Tuition-free” does not necessarily cover living or travel costs. If the listing says “not stated”, contact the organizer rather than assuming it is free.';
    if(/eligible|eligibility|age|country|grade|match/.test(q)) return 'Use Smart Matcher with a country, age and education level. It compares only the requirements recorded in each listing. A missing requirement is marked unknown, not treated as eligible. A potential match is not an admission guarantee; confirm citizenship/residency, age at the required date, grade, language and other rules with the organizer.';
    if(/cv|resume|curriculum/.test(q)) return 'A student CV can include: contact details (only what is necessary), education, relevant subjects, projects, volunteering, leadership, competitions, skills you can demonstrate, and languages. Use clear dates and describe your actual contribution. Do not invent experience. Open Prepare & Apply for a starter outline.';
    if(/essay|personal statement|motivation/.test(q)) return 'A strong application essay answers: Why this program? What real experience shaped your interest? What did you personally do? What did you learn? What would you contribute? Use specific evidence, follow the exact word limit, and keep your own voice. Open Prepare & Apply for a planning template.';
    if(/interview|question|pitch/.test(q)) return 'Prepare short, specific examples about motivation, a project, teamwork, a challenge and what you learned. For experience questions, use Situation, Task, Action and Result. If you do not know something, say so and explain how you would find out.';
    if(/study|focus|memory|spaced|recall|learn/.test(q)) return 'Try active recall: close the notes and retrieve what you remember, then check gaps. Review again after increasing intervals, solve practice questions, and explain the topic in your own words. Plan short focused sessions with a clear task and a break.';
    if(/time|planner|deadline|organize|organise/.test(q)) return 'Start by writing every task and its real deadline. Break large tasks into actions that take 20–60 minutes, prioritize the next important step, and leave time for recommendation letters and document checks. Confirm every application deadline and timezone on the official page.';
    if(/account|sign in|login|password/.test(q)) return ready?'Use Sign in for the configured email one-time-code flow. Never share your code.':'The account interface is included, but cloud accounts are not active in this preview. Local saved items and progress stay in this browser only.';
    if(/premium|pay|payment|subscription/.test(q)) return 'Premium is a proposed future plan. Payments are not active in this preview. Essential opportunity facts and basic discovery are intended to remain free. Do not send payment to anyone claiming to represent OpenDoor through this prototype.';
    if(/what can you do|help|how to use|opendoor/.test(q)) return 'I can help with five areas: (1) finding and comparing opportunities, (2) understanding eligibility and funding, (3) building a CV and planning essays, (4) preparing for interviews, and (5) using study and planning tools. Explore the matching, Academy and Prepare & Apply sections. I am currently using an offline guidance library, not a live generative AI model.';
    return 'I can offer general guidance on finding opportunities, eligibility, funding, CVs, essays, interviews, study habits and application planning. Try asking: “How do I find scholarships for high school students?”, “What does fully funded mean?”, or “Help me prepare a student CV.” This offline guide does not replace the program organizer or a qualified adviser.';
  }
  $('#odChatForm')?.addEventListener('submit', async e=>{
    e.preventDefault(); if(assistantBusy)return;
    const input=$('#odChatInput'), message=input.value.trim(); if(!message)return;
    appendMessage('user',message); input.value=''; assistantBusy=true; $('#odChatSend').disabled=true;
    const wait=document.createElement('div');wait.className='od-chat-msg bot od-thinking';wait.textContent='Thinking…';$('#odChatMessages').append(wait);
    try {
      const words=message.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2);
      const verifiedIds=(window.OD_DATA?.opportunities||[]).filter(o=>o.verificationStatus==='verified' && o.cloudVerified===true)
        .filter(o=>words.some(w=>(`${o.title} ${o.provider} ${o.category}`||'').toLowerCase().includes(w)))
        .slice(0,5).map(o=>o.id).filter(id=>/^[0-9a-f-]{36}$/i.test(String(id)));
      if(!ready){const answer=localGuideReply(message);wait.remove();appendMessage('bot',answer);history.push({role:'user',content:message},{role:'assistant',content:answer});history=history.slice(-8);return;}
      const result=await functionCall('student-assistant',{message,history,verified_ids:verifiedIds});
      wait.remove(); appendMessage('bot',result.answer || 'I could not generate an answer.');
      history.push({role:'user',content:message},{role:'assistant',content:result.answer||''}); history=history.slice(-8);
    } catch(err) { wait.remove(); const answer=localGuideReply(message)+`\n\nThe live AI service could not be reached: ${err.message}`; appendMessage('bot',answer); }
    finally { assistantBusy=false; $('#odChatSend').disabled=false; input.focus(); }
  });

  // Supabase Auth: account dashboard for signed-in users; login choices for visitors.
  const accountRoot=$('#odAccountRoot');
  if(accountRoot) accountRoot.innerHTML=`
    <button class="od-account-btn" id="odAccountOpen">Sign in</button>
    <div class="od-modal-backdrop" id="odAccountModal" hidden>
      <section class="od-account-modal" role="dialog" aria-modal="true" aria-labelledby="odAccountTitle">
        <button class="od-modal-close" id="odAccountClose" aria-label="Close">×</button>
        <span class="od-modal-kicker">YOUR STUDENT WORKSPACE</span>
        <div id="odSignInPanel">
          <h2 id="odAccountTitle">Sign in to OpenDoor</h2>
          <p>Choose a sign-in method. Use only an account you are authorized to use. Never share verification codes.</p>
          <button class="od-modal-secondary" id="odGoogleSignIn" type="button">Continue with Google</button>
          <div class="od-auth-divider">OR USE EMAIL</div>
          <form id="odOtpRequest"><label>Email address</label><input type="email" id="odEmail" maxlength="254" autocomplete="email" required placeholder="you@example.com"><button class="od-modal-primary">Email me a secure sign-in link</button></form>
          <button class="od-modal-secondary" id="odUsePhone" type="button" hidden>Use a phone number instead</button>
          <form id="odPhoneRequest" hidden><label>Phone number (international format)</label><input type="tel" id="odPhone" maxlength="16" autocomplete="tel" inputmode="tel" pattern="\\+[1-9][0-9]{7,14}" placeholder="+2519XXXXXXXX" required><button class="od-modal-primary">Send SMS code</button><small>SMS sign-in is available only after the administrator configures a supported provider.</small></form>
          <form id="odOtpVerify" hidden><label>Six-digit verification code</label><input id="odOtpCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"><button class="od-modal-primary">Verify and sign in</button></form>
          <p class="od-account-status" id="odAccountStatus" role="status"></p>
          <small>Only the minimum information needed for an account should be collected. For younger students, follow applicable parent/guardian consent and privacy rules.</small>
        </div>
        <div id="odSignedInPanel" hidden>
          <div class="od-profile-avatar" id="odProfileAvatar" aria-hidden="true">O</div>
          <h2 id="odSignedInName">Your account</h2>
          <p id="odSignedInSummary">You are signed in to OpenDoor.</p>
          <div class="od-account-details">
            <div><span>Email / phone</span><strong id="odProfileContact">—</strong></div>
            <div><span>Sign-in method</span><strong id="odProfileProvider">—</strong></div>
            <div><span>Member since</span><strong id="odProfileCreated">—</strong></div>
            <div><span>Membership</span><strong>Free account</strong></div>
          </div>
          <p class="od-account-status" id="odAccountStatusSignedIn" role="status">Your account session is active in this browser.</p>
          <button class="od-modal-secondary od-signout-button" id="odSignOut" type="button">Sign out</button>
          <small>For your security, sign out when using a shared device. Account profile editing and cloud-synced student progress will be added after the profile service is deployed.</small>
        </div>
      </section>
    </div>`;
  const topbar = $('.topbar');
  if (topbar && $('#odAccountOpen')) {
    const exportButton = topbar.querySelector('[data-act="export"]');
    topbar.insertBefore($('#odAccountOpen'), exportButton || null);
  }
  const authClient = ready && window.supabase?.createClient
    ? window.supabase.createClient(base, anon, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' } })
    : null;
  let otpMethod='email', otpContact='';
  function setAccountStatus(s){
    const el=$('#odAccountStatus'); if(el)el.textContent=s;
    const signed=$('#odAccountStatusSignedIn'); if(signed) signed.textContent=s;
  }
  function refreshAccountButton(){
    const user=session?.user;
    const signedIn=Boolean(session?.access_token && user);
    const button=$('#odAccountOpen');
    if(button)button.textContent=signedIn?'My account':'Sign in';
    const loginPanel=$('#odSignInPanel');
    const accountPanel=$('#odSignedInPanel');
    if(loginPanel)loginPanel.hidden=signedIn;
    if(accountPanel)accountPanel.hidden=!signedIn;
    const title=$('#odAccountTitle');
    if(title)title.textContent=signedIn?'Your OpenDoor account':'Sign in to OpenDoor';
    if(!signedIn)return;
    const metadata=user.user_metadata||{};
    const contact=user.email||user.phone||'Contact method not provided';
    const displayName=metadata.full_name||metadata.name||metadata.display_name||metadata.preferred_username||'Student account';
    const provider=user.app_metadata?.provider|| (user.email?'Email':'Phone');
    const avatar=$('#odProfileAvatar');
    const name=$('#odSignedInName');
    const summary=$('#odSignedInSummary');
    const contactEl=$('#odProfileContact');
    const providerEl=$('#odProfileProvider');
    const createdEl=$('#odProfileCreated');
    if(avatar)avatar.textContent=String(displayName).trim().charAt(0).toUpperCase()||'O';
    if(name)name.textContent=displayName;
    if(summary)summary.textContent='Your OpenDoor account is signed in and active in this browser.';
    if(contactEl)contactEl.textContent=contact;
    if(providerEl)providerEl.textContent=provider.charAt(0).toUpperCase()+provider.slice(1);
    if(createdEl){
      const date=user.created_at?new Date(user.created_at):null;
      createdEl.textContent=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'Date unavailable';
    }
  }
  if(authClient){
    authClient.auth.getSession().then(({data,error})=>{
      if(data?.session){saveSession(data.session);}
      else if(!session){saveSession(null);}
      refreshAccountButton();
      if(error)console.warn('Supabase session check failed.');
    });
    authClient.auth.onAuthStateChange((_event,newSession)=>{
      if(newSession){saveSession(newSession);}
      else{saveSession(null);}
      refreshAccountButton();
    });
  }
  $('#odAccountOpen')?.addEventListener('click',async()=>{
    $('#odAccountModal').hidden=false;
    refreshAccountButton();
    if(authClient){
      try{
        if(session?.access_token){
          const {data,error}=await authClient.auth.getUser(session.access_token);
          if(!error&&data?.user){
            session.user=data.user;
            saveSession(session);
          }else{
            const {data:current}=await authClient.auth.getSession();
            saveSession(current?.session||null);
          }
        }else{
          const {data}=await authClient.auth.getSession();
          saveSession(data?.session||null);
        }
      }catch(error){console.warn('Could not refresh account details.');}
    }
    refreshAccountButton();
    if(!session?.access_token)setAccountStatus(!ready?'Backend not connected.':!authClient?'Authentication client did not load. Refresh the page.':'Choose Google or email to sign in.');
  });
  $('#odAccountClose')?.addEventListener('click',()=>$('#odAccountModal').hidden=true);
  $('#odGoogleSignIn')?.addEventListener('click',async()=>{
    try{
      if(!authClient)throw new Error('Backend or authentication library is not connected.');
      setAccountStatus('Redirecting to Google…');
      const redirectTo=window.location.origin+window.location.pathname;
      const {error}=await authClient.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
      if(error)throw error;
    }catch(err){setAccountStatus(err.message||'Google sign-in could not start.');}
  });
  $('#odOtpRequest')?.addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      if(!authClient)throw new Error('Backend not connected. Check the Supabase URL and publishable key.');
      otpContact=$('#odEmail').value.trim();
      const emailRedirectTo=window.location.origin+window.location.pathname;
      const {error}=await authClient.auth.signInWithOtp({email:otpContact,options:{shouldCreateUser:true,emailRedirectTo}});
      if(error)throw error;
      $('#odOtpRequest').hidden=true;$('#odPhoneRequest').hidden=true;$('#odGoogleSignIn').hidden=true;$('#odUsePhone').hidden=true;$('#odOtpVerify').hidden=true;
      setAccountStatus('A secure sign-in link has been requested. Check your inbox and spam folder, then open it in this browser.');
    }catch(err){setAccountStatus(err.message||'Could not send email sign-in link.');}
  });
  if(cfg.ENABLE_PHONE_AUTH !== true){const phoneBtn=$('#odUsePhone');if(phoneBtn)phoneBtn.hidden=true;}
  $('#odUsePhone')?.addEventListener('click',()=>{
    $('#odOtpRequest').hidden=true;$('#odGoogleSignIn').hidden=true;$('#odUsePhone').hidden=true;$('#odPhoneRequest').hidden=false;
    setAccountStatus('Enter a number in international format. SMS requires a configured provider.');
  });
  $('#odPhoneRequest')?.addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      if(!authClient)throw new Error('Backend not connected.');
      otpMethod='phone';otpContact=$('#odPhone').value.trim();
      if(!/^\+[1-9]\d{7,14}$/.test(otpContact))throw new Error('Use international format, for example +2519XXXXXXXX.');
      const {error}=await authClient.auth.signInWithOtp({phone:otpContact,options:{channel:'sms',shouldCreateUser:true}});
      if(error)throw error;
      $('#odPhoneRequest').hidden=true;$('#odOtpVerify').hidden=false;
      setAccountStatus('SMS code requested. Check your messages.');
    }catch(err){setAccountStatus(err.message||'SMS sign-in is not configured.');}
  });
  $('#odOtpVerify')?.addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      if(!authClient)throw new Error('Backend not connected.');
      const token=$('#odOtpCode').value.trim();
      const params=otpMethod==='phone'?{phone:otpContact,token,type:'sms'}:{email:otpContact,token,type:'email'};
      const {data,error}=await authClient.auth.verifyOtp(params);
      if(error)throw error;
      if(!data?.session)throw new Error('Verification succeeded but no session was returned.');
      saveSession(data.session);
      refreshAccountButton();
      setAccountStatus(`Signed in as ${data.user?.email||data.user?.phone||'your account'}.`);
    }catch(err){setAccountStatus(err.message||'Code could not be verified.');}
  });
  $('#odSignOut')?.addEventListener('click',async()=>{
    try{if(authClient)await authClient.auth.signOut();}
    catch(err){setAccountStatus(err.message||'Could not complete sign out.');return;}
    saveSession(null);refreshAccountButton();setAccountStatus('Signed out.');
  });
  refreshAccountButton();

  // Replace the legacy local-preview feedback submit with moderated backend submission when configured.
  document.addEventListener('submit', async e=>{
    if(e.target?.id!=='communityFeedbackForm' || !ready)return;
    e.preventDefault();e.stopImmediatePropagation();
    const fd=new FormData(e.target), topic=String(fd.get('topic')||''), rating=Number(fd.get('rating')), comment=String(fd.get('comment')||'').trim();
    if(!confirm('Submit this comment for moderation? If approved, it may be displayed publicly. Do not include personal information.'))return;
    const btn=e.target.querySelector('button[type="submit"],button:not([type])');if(btn)btn.disabled=true;
    try{const r=await functionCall('submit-feedback',{topic,rating,comment});toast(r.message||'Feedback sent for moderation.');e.target.reset();}
    catch(err){toast(err.message);}
    finally{if(btn)btn.disabled=false;}
  },true);

  // Render only reviews approved by moderators.
  async function loadApprovedReviews(){
    if(!ready)return;
    const list=$('#feedbackList'); if(!list)return;
    try{const r=await fetch(`${base}/rest/v1/feedback?select=topic,rating,comment,created_at&status=eq.approved&order=created_at.desc&limit=10`,{headers:{apikey:anon,Authorization:`Bearer ${anon}`}});if(!r.ok)return;const rows=await r.json();
      const wrap=document.createElement('section');wrap.className='od-public-reviews';wrap.innerHTML='<h3>Community reviews</h3><p>Only feedback approved by moderators appears here.</p>';
      if(!rows.length){wrap.insertAdjacentHTML('beforeend','<p class="od-muted">No public reviews have been approved yet.</p>');}
      rows.forEach(x=>{const card=document.createElement('article');card.className='od-public-review';const title=document.createElement('b');title.textContent=`${x.topic} · ${'★'.repeat(x.rating)}${'☆'.repeat(5-x.rating)}`;const p=document.createElement('p');p.textContent=x.comment;card.append(title,p);wrap.append(card);});
      const existing=$('.od-public-reviews');existing?.remove();list.parentElement?.append(wrap);
    }catch{}
  }
  const observer=new MutationObserver(()=>{if(location.hash==='#feedback'||!location.hash)loadApprovedReviews();});
  const view=$('#view');if(view)observer.observe(view,{childList:true,subtree:true});

  // Premium checkout button uses hosted Checkout only; card details never touch this site.
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-backend-act="upgrade"]');if(!button)return;
    e.preventDefault();
    if(!ready){toast('Premium checkout is not connected yet.');return;}
    if(!session?.access_token){$('#odAccountModal').hidden=false;setAccountStatus('Sign in first. Paid checkout remains blocked until guardian/adult authorization and legal review are completed.');return;}
    button.disabled=true;const label=button.textContent;button.textContent='Checking…';
    try{const r=await functionCall('create-checkout',{});if(r.checkout_url)location.assign(r.checkout_url);else throw new Error('Checkout URL was not returned.');}
    catch(err){toast(err.message);button.disabled=false;button.textContent=label;}
  });


  async function loadVerifiedCloudOpportunities(){
    if(!ready || !window.OD_DATA?.opportunities)return;
    try{
      const response=await fetch(`${base}/rest/v1/opportunities?select=*&status=eq.verified&order=updated_at.desc&limit=1000`,{headers:{apikey:anon,Authorization:`Bearer ${anon}`}});
      if(!response.ok)return;
      const rows=await response.json();
      if(!Array.isArray(rows)||!rows.length)return;
      const mapped=rows.map((row,i)=>{
        const normalized=window.normaliseOpportunity ? window.normaliseOpportunity(row,i) : row;
        normalized.cloudVerified=true; normalized.verificationStatus='verified'; return normalized;
      });
      const known=new Set(mapped.map(o=>String(o.id)));
      window.OD_DATA.opportunities=[...mapped,...window.OD_DATA.opportunities.filter(o=>!known.has(String(o.id)))];
      if(location.hash==='#opportunities' && typeof window.render==='function')window.render();
    }catch(err){console.warn('Could not load verified OpenDoor catalogue records.');}
  }
  loadVerifiedCloudOpportunities();

  // Small status chip makes the release state explicit; it is not a fake live indicator.
  if(!ready){const banner=document.createElement('div');banner.className='od-setup-banner';banner.textContent='Preview mode · Connect the Supabase backend to activate AI chat, passwordless accounts, moderated reviews and Premium services.';document.body.prepend(banner);}
})();
