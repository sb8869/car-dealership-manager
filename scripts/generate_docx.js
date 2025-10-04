const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const outPath = path.join(__dirname, '..', 'Project_Handoff.docx');

function paragraph(text, opts = {}){
  if(Array.isArray(text)){
    return new Paragraph({
      children: text.map(t => typeof t === 'string' ? new TextRun(t) : t),
      ...opts
    });
  }
  return new Paragraph({ children: [ new TextRun(text) ], ...opts });
}

(async ()=>{
  try{
    const children = [];
    const c = children;

    // Title
    c.push(paragraph('Project Handoff — Car Dealer Prototype', { heading: HeadingLevel.HEADING_1 }));
    c.push(paragraph(''));

    // Snapshot
    c.push(paragraph('Snapshot', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Project: car-dealer-prototype (React + Vite SPA)'));
    c.push(paragraph('• Entry: index.html and src/main.jsx -> src/App.jsx'));
    c.push(paragraph('• Dev server: Vite (dev runs used port 5174 in the environment)'));
    c.push(paragraph('• Persistence: localStorage for cash, inventory, listings'));
    c.push(paragraph(''));

    // Features
    c.push(paragraph('High-level feature list', { heading: HeadingLevel.HEADING_2 }));
    const features = [
      'Market + Inventory browsing.',
      'Listing flow: move car from inventory -> listing.',
      'Buyer wave generation (automatic, scheduled, persisted).',
      'Negotiation flow wired: "Negotiate" opens negotiation modal with buyer context.',
      'Listing modal: shows listing details, buyer offers, price edit with 60s cooldown, non-numeric CooldownRing, scrollable buyer list.',
      'Header: Refresh Market button shares the same CooldownRing.',
      'Toasts for price updates and sale completion.',
      'Car generation fixed: damages reduce condition and estimated resale.'
    ];
    features.forEach(f=>c.push(paragraph('• ' + f)));
    c.push(paragraph(''));

    // Files changed
    c.push(paragraph('Files changed / created', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• src/App.jsx — central state and logic (generateCarInstance, buyer scheduling, cooldowns).'));
    c.push(paragraph('• src/components/Market.jsx — shows damage totals and warnings.'));
    c.push(paragraph('• src/components/ListingModal.jsx — listing UI, buyer list scrollable, price edit + CooldownRing.'));
    c.push(paragraph('• src/components/CooldownRing.jsx — new component for circular cooldown visuals.'));
    c.push(paragraph('• src/styles.css — modal height cap and .buyer-list scroll area.'));
    c.push(paragraph(''));

    // Data shapes
    c.push(paragraph('Data shapes', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Car: {id, make, model, year, mileage, condition, base, asking, reserve, estimatedResale, damages, status}'));
    c.push(paragraph('• Listing: car fields + {id, listPrice, createdAt, buyers[], waveSchedule[]}'));
    c.push(paragraph('• Buyer: {id, budget, offer, patience, interest}'));
    c.push(paragraph('• Modal: {side: "buy"|"listing"|"sell", subject: <car|listing>, buyer?: <buyer>}'));
    c.push(paragraph(''));

    // Buyer wave rules
    c.push(paragraph('Buyer wave rules (summary)', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Ratio = listPrice / (estimatedResale || base)'));
    c.push(paragraph('• ratio <= 0.95: attractive -> larger waves (3,2,1)'));
    c.push(paragraph('• ratio <= 1.05: reasonable -> smaller waves'));
    c.push(paragraph('• ratio <= 1.15: slightly high -> minimal waves'));
    c.push(paragraph('• ratio > 1.15: overpriced -> rare waves'));
    c.push(paragraph('• Follow-up waves for hot listings scheduled probabilistically (keeps marketplace lively).'));
    c.push(paragraph(''));

    // Cooldowns & UI
    c.push(paragraph('Cooldowns & UI', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Price update and refresh cooldowns: 60s each.'));
    c.push(paragraph('• Visual-only indication: CooldownRing (circular) shown in header and Listing modal (no numeric countdown).'));
    c.push(paragraph('• now state in App ticks once/second; ring animation smoothed with RAF.'));
    c.push(paragraph(''));

    // Fixes
    c.push(paragraph('What was fixed (history)', { heading: HeadingLevel.HEADING_2 }));
    const fixes = [
      'Negotiation modal wiring (Listing -> App -> NegotiationModal).',
      'Vite entry error (added root index.html earlier).',
      'ReferenceError (car vs subject) resolved by canonicalizing modal.subject.',
      'Buyer automation: removed manual generator; implemented scheduled waves and persistence.',
      'Damage/condition mismatch fixed: damages generated before pricing; condition reduced and estimatedResale adjusted.',
      'Duplicate Refresh button removed; consistent CooldownRing used.',
      'Modal stretching with many buyers fixed (scrollable buyer list + modal height cap).'
    ];
    fixes.forEach(f=>c.push(paragraph('• ' + f)));
    c.push(paragraph(''));

    // Known quirks
    c.push(paragraph('Known quirks & trade-offs', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Follow-up waves are probabilistic. Can be made deterministic if desired.'));
    c.push(paragraph('• Cooldown ring updates every second; RAF used for smoothing.'));
    c.push(paragraph('• Accessibility: CooldownRing has no ARIA descriptor yet.'));
    c.push(paragraph('• No automated tests included yet.'));
    c.push(paragraph(''));

    // How to run
    c.push(paragraph('How to run (PowerShell)', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('1. cd C:\\School\\project\\car-dealer-prototype'));
    c.push(paragraph('2. npm run dev'));
    c.push(paragraph('Note: Vite may fallback to another port if 5173 is busy (your runs used 5174).'));
    c.push(paragraph(''));

    // Next steps
    c.push(paragraph('Recommended next steps', { heading: HeadingLevel.HEADING_2 }));
    const steps = [
      'Add ARIA descriptors for cooldown controls (non-numeric).',
      'Optionally show a non-numeric next-wave indicator in Listing modal based on listing.waveSchedule.',
      'Add unit tests for generateCarInstance and schedule functions.',
      'Tune follow-up-wave aggressiveness or add a per-listing cap.',
      'Polish ring visuals or add optional ring size variants.'
    ];
    steps.forEach(s=>c.push(paragraph('• ' + s)));
    c.push(paragraph(''));

    // Quick debugging tips
    c.push(paragraph('Quick debugging tips', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('• Look at listing.waveSchedule for scheduled waves: it contains {id, dueAt, size}.'));
    c.push(paragraph('• Increase buyers quickly for testing by temporarily calling generateBuyerWave(listingId, size) from a dev console (or add a dev-only button).'));
    c.push(paragraph(''));

    // Handoff note
    c.push(paragraph('Contact / Handoff note', { heading: HeadingLevel.HEADING_2 }));
    c.push(paragraph('This DOCX handoff was generated from the repository state. If you want alternate formatting (styles, headings bolded, or a printable PDF) I can produce that next.'));
    c.push(paragraph(''));

    // Footer
    c.push(paragraph('Generated on: October 4, 2025', {}));

    const doc = new Document({
      creator: 'Project Handoff Script',
      title: 'Project Handoff',
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log('Wrote', outPath);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();
