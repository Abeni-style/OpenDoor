/* Short guided product tour. Uses the same navigation as the main website. */
(() => {
  if (document.getElementById('odPitchTour')) return;
  const wrap = document.createElement('div');
  wrap.className = 'od-tour-backdrop';
  wrap.id = 'odPitchTour';
  wrap.hidden = true;
  wrap.innerHTML = `
    <section class="od-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="odTourTitle">
      <div class="od-tour-top"><span class="od-tour-kicker">OPENDOOR · 3-MINUTE PRODUCT TOUR</span><button class="od-tour-close" type="button" data-close-pitch-tour aria-label="Close tour">×</button></div>
      <h2 id="odTourTitle">Four steps from discovery to action.</h2>
      <p class="od-tour-lede">This short walkthrough shows the main parts of the OpenDoor prototype. Choose a step to open that part of the website. Some cloud services are still in preview mode and are labelled accordingly.</p>
      <div class="od-tour-grid">
        <article class="od-tour-step"><span class="number">01 · DISCOVER</span><h3>Explore opportunities</h3><p>Browse the starter directory, search by category and inspect provider-source links and review labels.</p><button type="button" data-tour-destination="opportunities">Open opportunity explorer ↗</button></article>
        <article class="od-tour-step"><span class="number">02 · UNDERSTAND</span><h3>Check a potential fit</h3><p>Compare basic student details with recorded age, country and education requirements. Unknown data stays unknown.</p><button type="button" data-tour-destination="matcher">Open Smart Matcher ↗</button></article>
        <article class="od-tour-step"><span class="number">03 · DEVELOP</span><h3>Build practical skills</h3><p>Explore structured learning paths with lessons, practical exercises and knowledge checks.</p><button type="button" data-tour-destination="academy">Open Student Academy ↗</button></article>
        <article class="od-tour-step"><span class="number">04 · TAKE ACTION</span><h3>Prepare and track</h3><p>Review CV and application templates, save opportunities and organize next steps in the local student workspace.</p><button type="button" data-tour-destination="prepare">Open preparation tools ↗</button></article>
      </div>
      <p class="od-tour-note"><b>Demo transparency:</b> The current project is an interactive website prototype. AI chat, cloud accounts, public reviews, subscription payments and scheduled worldwide opportunity ingestion require backend deployment and configuration before they are live.</p>
    </section>`;
  document.body.append(wrap);
  const open = () => { wrap.hidden = false; document.body.style.overflow = 'hidden'; wrap.querySelector('[data-close-pitch-tour]')?.focus(); };
  const close = () => { wrap.hidden = true; document.body.style.overflow = ''; };
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-pitch-tour]')) open();
    if (event.target.closest('[data-close-pitch-tour]') || event.target === wrap) close();
    const dest = event.target.closest('[data-tour-destination]');
    if (dest) { const page = dest.getAttribute('data-tour-destination'); close(); if (typeof window.navigate === 'function') window.navigate(page); else location.hash = page; }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !wrap.hidden) close(); });
})();
