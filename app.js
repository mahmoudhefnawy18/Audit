const SUPABASE_URL =
  "https://epdinlgqlxfezrjjyhmk.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_xtEL7D8kZQiPiPMuXj-5ww_ibXNJhbr";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const STORE = 'gynae-audit-v3';
const WEEK_KEY = 'gynae-audit-week-monday';

let cases = JSON.parse(
  localStorage.getItem(STORE) ||
  localStorage.getItem('gynae-audit-v2') ||
  localStorage.getItem('gynae-audit-v1') ||
  '[]'
);


const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const z = n => String(n).padStart(2, '0');


function isoDate(d) {
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}


function chooseAuditMonday() {

  let saved =
    localStorage.getItem(WEEK_KEY);

  if (saved) return saved;

  const today = new Date();

  today.setHours(12, 0, 0, 0);

  const earliest =
    new Date(today);

  earliest.setMonth(
    earliest.getMonth() - 3
  );

  const mondays = [];

  const d =
    new Date(earliest);

  const shift =
    (8 - d.getDay()) % 7;

  d.setDate(
    d.getDate() + shift
  );

  while (d <= today) {

    mondays.push(
      isoDate(d)
    );

    d.setDate(
      d.getDate() + 7
    );
  }

  saved =
    mondays[
      Math.floor(
        Math.random() *
        mondays.length
      )
    ] ||
    isoDate(today);

  localStorage.setItem(
    WEEK_KEY,
    saved
  );

  return saved;
}


const AUDIT_MONDAY =
  chooseAuditMonday();


function datePlus(
  dateStr,
  days
) {

  const d =
    new Date(
      dateStr +
      'T12:00:00'
    );

  d.setDate(
    d.getDate() + days
  );

  return isoDate(d);
}


function combineDT(
  dateId,
  timeId
) {

  const d =
    $('#' + dateId)?.value;

  const t =
    $('#' + timeId)?.value;

  return d && t
    ? `${d}T${t}`
    : '';
}


function splitDT(
  v,
  dateId,
  timeId
) {

  const d =
    $('#' + dateId);

  const t =
    $('#' + timeId);

  if (!d || !t) return;

  if (
    v &&
    v.includes('T')
  ) {

    const [dd, tt] =
      v.split('T');

    d.value = dd;

    t.value =
      tt.slice(0, 5);

  } else {

    d.value =
      AUDIT_MONDAY;

    t.value =
      '09:00';
  }
}


function saveLocal() {

  localStorage.setItem(
    STORE,
    JSON.stringify(cases)
  );

  renderCases();
}


async function loadFromSupabase() {

  const { data, error } =
    await supabaseClient
      .from('gynae_audit_cases')
      .select('*')
      .order(
        'case_number',
        {
          ascending: true
        }
      );

  if (error) {

    console.error(
      'Supabase load error:',
      JSON.stringify(
        error,
        null,
        2
      )
    );

    renderCases();

    return;
  }

  cases =
    (data || []).map(
      row => {

        const c =
          row.case_data || {};

        return {
          ...c,
          id: row.id,
          caseNumber:
            row.case_number,
          date:
            row.case_date
        };
      }
    );

  localStorage.setItem(
    STORE,
    JSON.stringify(cases)
  );

  renderCases();
}


async function saveCaseToSupabase(c) {

  const row = {

    id: c.id,

    case_number:
      c.caseNumber,

    case_date:
      c.date,

    procedure:
      c.procedure || null,

    asa:
      c.asa || null,

    postop_destination:
      c.postopCare || null,

    pca:
      c.pca === 'Yes',

    rsc:
      c.rsc === 'Yes',

    it_diamorphine:
      c.itDiamorph === 'Yes',

    case_data: c,

    updated_at:
      new Date().toISOString()
  };


  const { error } =
    await supabaseClient
      .from(
        'gynae_audit_cases'
      )
      .upsert(
        row,
        {
          onConflict: 'id'
        }
      );


  if (error) {

    console.error(
      'Supabase save error:',
      JSON.stringify(
        error,
        null,
        2
      )
    );

    alert(
      'The case was saved on this device, but could not sync to Supabase.'
    );

    return false;
  }

  return true;
}


function showView(id) {

  $$('.view').forEach(
    v =>
      v.classList.toggle(
        'active',
        v.id === id
      )
  );

  $$('.tab').forEach(
    b =>
      b.classList.toggle(
        'active',
        b.dataset.view === id
      )
  );

  scrollTo(0, 0);
}


$$('.tab').forEach(
  b =>
    b.onclick =
      () =>
        showView(
          b.dataset.view
        )
);


$('#newCaseBtn').onclick =
  () => newCase();


function nextNo() {

  const nums =
    cases
      .map(
        c =>
          Number(
            c.caseNumber
          )
      )
      .filter(
        n =>
          Number.isFinite(n) &&
          n >= 1
      );

  return nums.length
    ? Math.max(...nums) + 1
    : 1;
}


function localDT(d) {

  return (
    `${isoDate(d)}T` +
    `${z(d.getHours())}:` +
    `${z(d.getMinutes())}`
  );
}


function parseDT(v) {

  return v
    ? new Date(v)
    : null;
}


function addMin(d, m) {

  return new Date(
    d.getTime() +
    m * 60000
  );
}


function fmt(v) {

  if (!v) return '';

  const d =
    parseDT(v);

  return d.toLocaleString(
    [],
    {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }
  );
}


function setDefaultDateTimes() {

  [
    'caseDate',
    'dischargeDate',
    'pcaStartDate',
    'rscStartDate',
    'itDate',
    'recoveryDate'
  ].forEach(
    id => {

      if ($('#' + id)) {

        $('#' + id).value =
          AUDIT_MONDAY;
      }
    }
  );


  [
    'dischargeClock',
    'pcaStartClock',
    'rscStartClock',
    'itClock',
    'recoveryClock'
  ].forEach(
    id => {

      if ($('#' + id)) {

        $('#' + id).value =
          '09:00';
      }
    }
  );
}


function resetForm() {

  $('#caseForm').reset();

  $('#caseId').value = '';

  $('#observations').innerHTML =
    '';

  $('#deleteCase')
    .classList
    .add('hidden');


  [
    'poPara',
    'ivPara',
    'codeine',
    'ibuprofen',
    'oralOpiates'
  ].forEach(
    id =>
      $('#' + id).value = 0
  );


  // Ibuprofen "Not prescribed"
  // is reset for every new case.
  $('#ibuprofenNP').checked =
    false;


  setDefaultDateTimes();

  updateConditional();
}


function newCase() {

  resetForm();

  $('#caseNumber').value =
    nextNo();

  showView('form');
}


function val(id) {
  return $('#' + id).value;
}


function num(id) {

  return val(id) === ''
    ? ''
    : Number(val(id));
}


function monitoringSelected() {

  return (
    val('pca') === 'Yes' ||
    val('rsc') === 'Yes' ||
    val('itDiamorph') === 'Yes'
  );
}


function updateConditional() {

  const p =
    val('pca') === 'Yes';

  const r =
    val('rsc') === 'Yes';

  const it =
    val('itDiamorph') === 'Yes';


  $('#pcaTimeWrap')
    .classList
    .toggle(
      'hidden',
      !p
    );


  $('#rscTimeWrap')
    .classList
    .toggle(
      'hidden',
      !r
    );


  $('#itTimeWrap')
    .classList
    .toggle(
      'hidden',
      !it
    );


  $('#recoveryTimeWrap')
    .classList
    .toggle(
      'hidden',
      !it
    );


  $('#obsCard')
    .classList
    .toggle(
      'hidden',
      !(p || r || it)
    );


  $('#noObsMessage')
    .classList
    .toggle(
      'hidden',
      p || r || it
    );


  $$('.pcaField')
    .forEach(
      x =>
        x.classList.toggle(
          'hidden',
          !p
        )
    );


  $$('.rscFields')
    .forEach(
      x =>
        x.classList.toggle(
          'hidden',
          !r
        )
    );


  if (!(p || r || it)) {

    $('#observations')
      .innerHTML = '';
  }
}


[
  'pca',
  'rsc',
  'itDiamorph'
].forEach(
  id =>
    $('#' + id).onchange =
      () => {

        updateConditional();

        generateSchedule();
      }
);


function protocolTimes(
  start,
  end,
  reason
) {

  const out = [];

  if (!start) return out;


  const limit =
    new Date(
      Math.min(
        addMin(
          start,
          48 * 60
        ).getTime(),

        end
          ? end.getTime()
          : Infinity
      )
    );


  [
    15,
    30,
    45,
    60
  ].forEach(
    m => {

      const t =
        addMin(
          start,
          m
        );

      if (t <= limit) {

        out.push({
          t,
          reason
        });
      }
    }
  );


  for (
    let m = 120;
    m <= 300;
    m += 60
  ) {

    const t =
      addMin(
        start,
        m
      );

    if (t <= limit) {

      out.push({
        t,
        reason
      });
    }
  }


  for (
    let m = 540;
    m <= 48 * 60;
    m += 240
  ) {

    const t =
      addMin(
        start,
        m
      );

    if (t <= limit) {

      out.push({
        t,
        reason
      });
    }
  }


  return out;
}


function getDischarge() {

  return parseDT(
    combineDT(
      'dischargeDate',
      'dischargeClock'
    )
  );
}


function generateSchedule() {

  if (!monitoringSelected()) {

    $('#observations')
      .innerHTML = '';

    return;
  }


  const discharge =
    getDischarge();

  let entries = [];


  if (
    val('pca') === 'Yes'
  ) {

    entries.push(
      ...protocolTimes(
        parseDT(
          combineDT(
            'pcaStartDate',
            'pcaStartClock'
          )
        ),
        discharge,
        'PCA'
      )
    );
  }


  if (
    val('rsc') === 'Yes'
  ) {

    entries.push(
      ...protocolTimes(
        parseDT(
          combineDT(
            'rscStartDate',
            'rscStartClock'
          )
        ),
        discharge,
        'RSC'
      )
    );
  }


  if (
    val('itDiamorph') === 'Yes'
  ) {

    const it =
      parseDT(
        combineDT(
          'itDate',
          'itClock'
        )
      );

    const rec =
      parseDT(
        combineDT(
          'recoveryDate',
          'recoveryClock'
        )
      );


    entries.push(
      ...protocolTimes(
        it,
        discharge,
        'IT diamorphine'
      ).filter(
        x =>
          !rec ||
          x.t >= rec
      )
    );
  }


  const merged =
    new Map();


  entries.forEach(
    x => {

      const k =
        localDT(x.t);

      if (
        merged.has(k)
      ) {

        const old =
          merged.get(k);

        if (
          !old.reason.includes(
            x.reason
          )
        ) {

          old.reason +=
            ' + ' +
            x.reason;
        }

      } else {

        merged.set(
          k,
          {
            requiredAt: k,
            reason: x.reason
          }
        );
      }
    }
  );


  const old =
    new Map(
      collectObs()
        .map(
          o => [
            o.requiredAt,
            o
          ]
        )
    );


  const schedule =
    [...merged.values()]
      .sort(
        (a, b) =>
          a.requiredAt
            .localeCompare(
              b.requiredAt
            )
      )
      .map(
        x => ({
          ...x,
          ...(old.get(
            x.requiredAt
          ) || {}),
          requiredAt:
            x.requiredAt,
          reason:
            x.reason
        })
      );


  $('#observations')
    .innerHTML = '';


  schedule.forEach(
    addObservation
  );


  $('#scheduleHint')
    .textContent =
      schedule.length
        ? `${schedule.length} required observation time(s), stopping at discharge or 48 hours.`
        : 'Enter the relevant start/recovery times to generate the schedule.';


  updateConditional();
}


$('#generateObs').onclick =
  generateSchedule;


[
  'pcaStartDate',
  'pcaStartClock',
  'rscStartDate',
  'rscStartClock',
  'itDate',
  'itClock',
  'recoveryDate',
  'recoveryClock',
  'dischargeDate',
  'dischargeClock'
].forEach(
  id =>
    $('#' + id)
      .addEventListener(
        'change',
        generateSchedule
      )
);


function addObservation(
  data = {}
) {

  const node =
    $('#obsTemplate')
      .content
      .cloneNode(true);


  const obs =
    node.querySelector(
      '.obs'
    );


  obs.querySelector(
    '[data-k="requiredAt"]'
  ).value =
    data.requiredAt || '';


  obs.querySelector(
    '[data-k="reason"]'
  ).value =
    data.reason || '';


  obs.querySelector(
    '[data-k-display="requiredAt"]'
  ).textContent =
    fmt(data.requiredAt);


  obs.querySelector(
    '[data-k-display="reason"]'
  ).textContent =
    data.reason || '';


  obs.querySelectorAll(
    '[data-k]'
  ).forEach(
    el => {

      if (
        [
          'requiredAt',
          'reason',
          'actualDate',
          'actualClock'
        ].includes(
          el.dataset.k
        )
      ) {
        return;
      }

      if (
        data[
          el.dataset.k
        ] !== undefined
      ) {

        el.value =
          data[
            el.dataset.k
          ] ?? '';
      }
    }
  );


  let actualDate =
    data.actualDate || '';

  let actualClock =
    data.actualClock || '';


  if (
    data.actualTime &&
    data.actualTime.includes('T')
  ) {

    [
      actualDate,
      actualClock
    ] =
      data.actualTime.split('T');
  }


  obs.querySelector(
    '[data-k="actualDate"]'
  ).value =
    actualDate ||
    (
      (
        data.requiredAt ||
        ''
      ).split('T')[0] ||
      AUDIT_MONDAY
    );


  obs.querySelector(
    '[data-k="actualClock"]'
  ).value =
    (
      actualClock ||
      '09:00'
    ).slice(0, 5);


  const sel =
    obs.querySelector(
      '[data-k="observationPostop"]'
    );

  const ad =
    obs.querySelector(
      '[data-k="actualDate"]'
    );

  const at =
    obs.querySelector(
      '[data-k="actualClock"]'
    );

  const pill =
    obs.querySelector(
      '.status-pill'
    );


  function status() {

    pill.textContent =
      sel.value === 'Y'
        ? 'Done'
        : sel.value === 'N'
          ? 'Missed'
          : 'Due';


    pill.className =
      'status-pill ' +
      (
        sel.value === 'Y'
          ? 'done'
          : sel.value === 'N'
            ? 'missed'
            : ''
      );
  }


  sel.onchange =
    () => {

      if (
        sel.value === 'Y' &&
        data.requiredAt
      ) {

        const [dd, tt] =
          data.requiredAt
            .split('T');

        ad.value = dd;

        at.value =
          tt.slice(0, 5);
      }

      status();
    };


  status();

  $('#observations')
    .appendChild(node);
}


function collectObs() {

  return $$('#observations .obs')
    .map(
      o => {

        const x = {};

        o.querySelectorAll(
          '[data-k]'
        ).forEach(
          el =>
            x[
              el.dataset.k
            ] =
              el.value
        );


        x.actualTime =
          x.actualDate &&
          x.actualClock
            ? `${x.actualDate}T${x.actualClock}`
            : '';


        return x;
      }
    );
}


$('#caseForm').onsubmit =
  async e => {

    e.preventDefault();


    if (
      monitoringSelected() &&
      !$('#observations')
        .children.length
    ) {

      generateSchedule();


      if (
        !$('#observations')
          .children.length &&
        !confirm(
          'No observation schedule could be generated. Save anyway?'
        )
      ) {

        return;
      }
    }


    const id =
      val('caseId') ||
      crypto.randomUUID();


    const c = {

      id,

      caseNumber:
        Number(
          val('caseNumber')
        ) ||
        nextNo(),

      date:
        val('caseDate'),

      procedure:
        val('procedure'),

      asa:
        val('asa'),

      postopCare:
        val('postopCare'),

      pca:
        val('pca'),

      itDiamorph:
        val('itDiamorph'),

      rsc:
        val('rsc'),

      postopPrescriptions:
        val(
          'postopPrescriptions'
        ),

      poPara:
        num('poPara'),

      ivPara:
        num('ivPara'),

      codeine:
        num('codeine'),

      ibuprofen:
        num('ibuprofen'),

      // NEW:
      // stores whether ibuprofen
      // was not prescribed.
      ibuprofenNP:
        $('#ibuprofenNP').checked,

      oralOpiates:
        num('oralOpiates'),

      pcaStartTime:
        combineDT(
          'pcaStartDate',
          'pcaStartClock'
        ),

      rscStartTime:
        combineDT(
          'rscStartDate',
          'rscStartClock'
        ),

      itTime:
        combineDT(
          'itDate',
          'itClock'
        ),

      recoveryTime:
        combineDT(
          'recoveryDate',
          'recoveryClock'
        ),

      dischargeTime:
        combineDT(
          'dischargeDate',
          'dischargeClock'
        ),

      observations:
        monitoringSelected()
          ? collectObs()
          : [],

      updatedAt:
        new Date()
          .toISOString()
    };


    const i =
      cases.findIndex(
        x =>
          x.id === id
      );


    if (i >= 0) {

      cases[i] = c;

    } else {

      cases.push(c);
    }


    saveLocal();


    const synced =
      await saveCaseToSupabase(c);


    if (synced) {

      await loadFromSupabase();
    }


    showView('home');
  };


function editCase(id) {

  const c =
    cases.find(
      x =>
        x.id === id
    );

  if (!c) return;


  resetForm();


  $('#caseId').value =
    c.id;


  $('#caseNumber').value =
    Number(
      c.caseNumber
    ) >= 1
      ? c.caseNumber
      : nextNo();


  $('#caseDate').value =
    c.date ||
    AUDIT_MONDAY;


  $('#procedure').value =
    c.procedure || '';


  $('#asa').value =
    c.asa || '';


  $('#postopCare').value =
    c.postopCare || '';


  $('#pca').value =
    c.pca || 'No';


  $('#itDiamorph').value =
    c.itDiamorph || 'No';


  $('#rsc').value =
    c.rsc || 'No';


  $('#postopPrescriptions')
    .value =
      c.postopPrescriptions ||
      'Protocol';


  [
    'poPara',
    'ivPara',
    'codeine',
    'ibuprofen',
    'oralOpiates'
  ].forEach(
    k =>
      $('#' + k).value =
        c[k] ?? 0
  );


  // NEW:
  // restore the ibuprofen
  // "Not prescribed" checkbox.
  $('#ibuprofenNP').checked =
    c.ibuprofenNP === true;


  splitDT(
    c.pcaStartTime,
    'pcaStartDate',
    'pcaStartClock'
  );


  splitDT(
    c.rscStartTime,
    'rscStartDate',
    'rscStartClock'
  );


  splitDT(
    c.itTime,
    'itDate',
    'itClock'
  );


  splitDT(
    c.recoveryTime,
    'recoveryDate',
    'recoveryClock'
  );


  splitDT(
    c.dischargeTime,
    'dischargeDate',
    'dischargeClock'
  );


  (
    c.observations || []
  ).forEach(
    addObservation
  );


  $('#deleteCase')
    .classList
    .remove('hidden');


  updateConditional();


  $('#scheduleHint')
    .textContent =
      c.observations?.length
        ? `${c.observations.length} required observation time(s).`
        : '';


  showView('form');
}


$('#deleteCase').onclick =
  async () => {

    const id =
      val('caseId');


    if (!id) {

      alert(
        'Unable to identify this case. Please return to Cases and reopen it.'
      );

      return;
    }


    if (
      !confirm(
        'Delete this case?'
      )
    ) {

      return;
    }


    const { error } =
      await supabaseClient
        .from(
          'gynae_audit_cases'
        )
        .delete()
        .eq(
          'id',
          id
        );


    if (error) {

      console.error(
        'Supabase delete error:',
        JSON.stringify(
          error,
          null,
          2
        )
      );

      alert(
        'Unable to delete this case from Supabase.'
      );

      return;
    }


    cases =
      cases.filter(
        c =>
          c.id !== id
      );


    saveLocal();

    resetForm();

    showView('home');
  };


function renderCases() {

  $('#caseCount')
    .textContent =
      cases.length;


  $('#obsCount')
    .textContent =
      cases.reduce(
        (
          a,
          c
        ) =>
          a +
          (
            c.observations
              ?.length ||
            0
          ),
        0
      );


  $('#incompleteCount')
    .textContent =
      cases.filter(
        c =>
          !c.procedure ||
          !c.asa
      ).length;


  $('#auditWeek')
    .textContent =
      `Audit week: ${
        new Date(
          AUDIT_MONDAY +
          'T12:00:00'
        ).toLocaleDateString(
          [],
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )
      } – ${
        new Date(
          datePlus(
            AUDIT_MONDAY,
            6
          ) +
          'T12:00:00'
        ).toLocaleDateString(
          [],
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )
      }`;


  const area =
    $('#caseList');


  area.innerHTML = '';


  if (!cases.length) {

    area.innerHTML =
      '<div class="empty">No cases yet.<br>Tap “New patient” to start.</div>';

    return;
  }


  cases
    .slice()
    .sort(
      (a, b) =>
        (
          Number(
            b.caseNumber
          ) || 0
        ) -
        (
          Number(
            a.caseNumber
          ) || 0
        )
    )
    .forEach(
      c => {

        const d =
          document.createElement(
            'div'
          );


        d.className =
          'case-item';


        d.innerHTML =
          `<div>
            <b>Case ${
              Number(
                c.caseNumber
              ) >= 1
                ? c.caseNumber
                : '—'
            }</b>
            <small>
              ${c.date || ''} ·
              ${esc(
                c.procedure ||
                'No procedure'
              )}
              <br>
              ${
                c.observations
                  ?.length ||
                0
              } scheduled observation(s)
            </small>
          </div>
          <button type="button">
            Edit
          </button>`;


        d.querySelector(
          'button'
        ).onclick =
          () =>
            editCase(
              c.id
            );


        area.appendChild(d);
      }
    );
}


function esc(s) {

  const d =
    document.createElement(
      'div'
    );

  d.textContent = s;

  return d.innerHTML;
}


const headers = [
  'Case Number',
  'Date',
  'Procedure',
  'ASA',
  'Postop care',
  'PCA',
  'IT Diamorphine',
  'RSC',
  'Postop prescriptions',
  'PO Paracetamol doses',
  'IV Paracetamol doses',
  'Codeine doses',
  'Ibuprofen doses',
  'Oral Opiates',
  'PCA start',
  'RSC start',
  'IT Diamorphine time',
  'Recovery arrival',
  'Discharge',
  'Minimum required',
  'Monitoring reason',
  'Observation postop',
  'Actual observation time',
  'Pain score',
  'N & V score',
  'Sedation score',
  'Function activity',
  'Itching',
  'Hallucination',
  'Total PCA administered',
  'LA bolus',
  'RSC rate',
  'LA toxicity score',
  'LA site assessment',
  'Motor power',
  'Sensory score',
  'Dermatome height',
  'SLT'
];


function exportRows() {

  const rows =
    [headers];


  cases
    .slice()
    .sort(
      (a, b) =>
        (
          Number(
            a.caseNumber
          ) || 0
        ) -
        (
          Number(
            b.caseNumber
          ) || 0
        )
    )
    .forEach(
      c => {

        const obs =
          c.observations?.length
            ? c.observations
            : [{}];


        obs.forEach(
          (o, i) => {

            rows.push([

              i === 0
                ? c.caseNumber
                : '',

              i === 0
                ? c.date
                : '',

              i === 0
                ? c.procedure
                : '',

              i === 0
                ? c.asa
                : '',

              i === 0
                ? c.postopCare
                : '',

              i === 0
                ? c.pca
                : '',

              i === 0
                ? c.itDiamorph
                : '',

              i === 0
                ? c.rsc
                : '',

              i === 0
                ? c.postopPrescriptions
                : '',

              i === 0
                ? c.poPara
                : '',

              i === 0
                ? c.ivPara
                : '',

              i === 0
                ? c.codeine
                : '',

              // NEW:
              // NP = Not prescribed
              i === 0
                ? (
                    c.ibuprofenNP
                      ? 'NP'
                      : c.ibuprofen
                  )
                : '',

              i === 0
                ? c.oralOpiates
                : '',

              i === 0
                ? c.pcaStartTime
                : '',

              i === 0
                ? c.rscStartTime
                : '',

              i === 0
                ? c.itTime
                : '',

              i === 0
                ? c.recoveryTime
                : '',

              i === 0
                ? c.dischargeTime
                : '',

              o.requiredAt || '',

              o.reason || '',

              o.observationPostop || '',

              o.actualTime ||
              (
                o.actualDate &&
                o.actualClock
                  ? `${o.actualDate}T${o.actualClock}`
                  : ''
              ),

              o.painScore || '',

              o.nvScore || '',

              o.sedationScore || '',

              o.functionalActivity || '',

              o.itching || '',

              o.hallucination || '',

              o.totalPca || '',

              o.laBolus || '',

              o.rscRate || '',

              o.laToxicity || '',

              o.laSite || '',

              o.motorPower || '',

              o.sensoryScore || '',

              o.dermatomeHeight || '',

              o.slt || ''

            ]);
          }
        );
      }
    );


  return rows;
}


$('#exportExcel').onclick =
  () => {

    const ws =
      XLSX.utils
        .aoa_to_sheet(
          exportRows()
        );


    ws['!cols'] =
      headers.map(
        (h, i) => ({
          wch:
            i === 2
              ? 45
              : Math.max(
                  12,
                  Math.min(
                    24,
                    h.length + 2
                  )
                )
        })
      );


    const wb =
      XLSX.utils
        .book_new();


    XLSX.utils
      .book_append_sheet(
        wb,
        ws,
        'Audit Data'
      );


    XLSX.writeFile(
      wb,
      `Gynae_Audit_${
        new Date()
          .toISOString()
          .slice(0, 10)
      }.xlsx`
    );
  };


$('#exportBackup').onclick =
  () => {

    const blob =
      new Blob(
        [
          JSON.stringify(
            {
              version: 3,
              auditMonday:
                AUDIT_MONDAY,
              exportedAt:
                new Date()
                  .toISOString(),
              cases
            },
            null,
            2
          )
        ],
        {
          type:
            'application/json'
        }
      );


    const a =
      document.createElement(
        'a'
      );


    a.href =
      URL.createObjectURL(
        blob
      );


    a.download =
      `Gynae_Audit_Backup_${
        new Date()
          .toISOString()
          .slice(0, 10)
      }.json`;


    a.click();


    setTimeout(
      () =>
        URL.revokeObjectURL(
          a.href
        ),
      1000
    );
  };


$('#importBackup').onchange =
  async e => {

    const f =
      e.target.files[0];

    if (!f) return;


    try {

      const j =
        JSON.parse(
          await f.text()
        );


      const incoming =
        Array.isArray(j)
          ? j
          : j.cases;


      if (
        !Array.isArray(
          incoming
        )
      ) {

        throw new Error(
          'Invalid backup'
        );
      }


      if (
        !confirm(
          `Import ${incoming.length} case(s)? This will replace the current cloud audit data.`
        )
      ) {

        return;
      }


      const {
        error: deleteError
      } =
        await supabaseClient
          .from(
            'gynae_audit_cases'
          )
          .delete()
          .not(
            'id',
            'is',
            null
          );


      if (deleteError) {

        throw deleteError;
      }


      for (
        const c of incoming
      ) {

        if (!c.id) {

          c.id =
            crypto.randomUUID();
        }


        const success =
          await saveCaseToSupabase(
            c
          );


        if (!success) {

          throw new Error(
            'Unable to upload one or more cases.'
          );
        }
      }


      if (
        j.auditMonday
      ) {

        localStorage.setItem(
          WEEK_KEY,
          j.auditMonday
        );
      }


      await loadFromSupabase();


      alert(
        'Backup imported to Supabase successfully.'
      );


      showView('home');

    } catch (error) {

      console.error(
        'Backup import error:',
        error
      );


      alert(
        'The backup could not be imported.'
      );

    } finally {

      e.target.value = '';
    }
  };


if (
  'serviceWorker' in navigator
) {

  navigator
    .serviceWorker
    .register('./sw.js')
    .catch(
      console.error
    );
}


loadFromSupabase();
