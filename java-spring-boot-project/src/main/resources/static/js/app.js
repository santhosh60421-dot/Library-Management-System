let savedRecordsCache = [];
let selectedIssueId = null;

function showAlert(type, message) {
  const container = document.getElementById('alertContainer');
  container.innerHTML = `
    <div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const parts = iso.split('-');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : iso;
}

function statusBadgeHtml(status) {
  if (status === 'RETURNED') return '<span class="badge badge-returned">Returned</span>';
  if (status === 'OVERDUE') return '<span class="badge badge-overdue">Overdue</span>';
  return '<span class="badge badge-issued">Issued</span>';
}

function renderEndResultHtml(rec) {
  return `
    <div class="card border-0 shadow-sm p-4">
      <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
        <div>
          <h5 class="fw-bold lms-navy mb-0">END RESULT</h5>
          <div class="small text-muted">LIBRARY MANAGEMENT SYSTEM · Circulation &amp; Fine Outcome</div>
        </div>
        <div class="text-end small">
          <div class="text-muted">Issue ID</div>
          <div class="fw-bold">${escapeHtml(rec.issueId)}</div>
        </div>
      </div>
      <div class="row g-3 small">
        <div class="col-6"><strong>Student Name:</strong><br/>${escapeHtml(rec.studentName)}</div>
        <div class="col-6"><strong>Student ID:</strong><br/>${escapeHtml(rec.studentId)}</div>
        <div class="col-6"><strong>Book Name:</strong><br/>${escapeHtml(rec.bookName)}</div>
        <div class="col-6"><strong>Book Number:</strong><br/>${escapeHtml(rec.bookNumber)}</div>
        <div class="col-4"><strong>Starting Date:</strong><br/>${formatDate(rec.issueDate)}</div>
        <div class="col-4"><strong>Final Due Date:</strong><br/>${formatDate(rec.dueDate)}</div>
        <div class="col-4"><strong>Return Date:</strong><br/>${rec.returnDate ? formatDate(rec.returnDate) : 'Pending'}</div>
        <div class="col-4"><strong>Late Days (₹50/day):</strong><br/>${rec.lateDays} day(s) × ₹50</div>
        <div class="col-4"><strong>Total Fine To Be Paid:</strong><br/><span class="fw-bold fs-6 ${rec.fineAmount > 0 ? 'text-danger' : 'text-success'}">₹${rec.fineAmount}</span></div>
        <div class="col-4"><strong>Status:</strong><br/>${statusBadgeHtml(rec.status)}</div>
      </div>
    </div>
  `;
}

function updateFinePreview(dueElId, retElId, previewElId) {
  const preview = document.getElementById(previewElId);
  const dueIso = document.getElementById(dueElId).value;
  const retIso = document.getElementById(retElId).value;
  if (!dueIso || !retIso) {
    preview.classList.add('d-none');
    return;
  }
  const diffDays = Math.round((Date.parse(retIso + 'T00:00:00Z') - Date.parse(dueIso + 'T00:00:00Z')) / 86400000);
  const extraDays = Math.max(0, diffDays);
  const fine = extraDays * 50;
  preview.classList.remove('d-none', 'alert-light', 'alert-danger', 'alert-success');
  preview.classList.add(extraDays > 0 ? 'alert-danger' : 'alert-success');
  preview.innerHTML = extraDays > 0
    ? `<strong>Fine Preview:</strong> Return Date is ${extraDays} day(s) more than Final Date. Total Fine To Be Paid: <strong>₹${fine}</strong> (${extraDays} × ₹50).`
    : `<strong>On-Time Return:</strong> Return Date is on or before Final Date. Total Fine To Be Paid: <strong>₹0</strong>.`;
}

function selectSavedRecord(issueId) {
  const rec = savedRecordsCache.find((r) => r.issueId === issueId);
  if (!rec) return;
  selectedIssueId = rec.issueId;
  document.getElementById('issueCard').classList.add('d-none');
  document.getElementById('savedReturnCard').classList.remove('d-none');
  document.getElementById('savedIssueMeta').textContent = `Saved Issue ID: ${rec.issueId}`;
  document.getElementById('savedStudentDetails').innerHTML = `
    <div class="col-6"><strong>Student Name:</strong> ${escapeHtml(rec.studentName)}</div>
    <div class="col-6"><strong>Student ID:</strong> ${escapeHtml(rec.studentId)}</div>
    <div class="col-6"><strong>Book Name:</strong> ${escapeHtml(rec.bookName)}</div>
    <div class="col-6"><strong>Book Number:</strong> ${escapeHtml(rec.bookNumber)}</div>
    <div class="col-12"><strong>Starting Date:</strong> ${formatDate(rec.issueDate)}</div>
  `;
  document.getElementById('savedDueDate').value = rec.dueDate;
  document.getElementById('savedReturnDate').value = rec.returnDate || '';
  document.getElementById('issueResultBox').innerHTML = renderEndResultHtml(rec);
  updateFinePreview('savedDueDate', 'savedReturnDate', 'savedFinePreview');
  renderSavedRecordsList();
}

function resetToIssueMode() {
  selectedIssueId = null;
  document.getElementById('savedReturnCard').classList.add('d-none');
  document.getElementById('issueCard').classList.remove('d-none');
  renderSavedRecordsList();
}

function renderSavedRecordsList() {
  const q = (document.getElementById('savedSearchInput').value || '').trim().toLowerCase();
  const filtered = savedRecordsCache.filter((r) =>
    !q ||
    r.studentId.toLowerCase().includes(q) ||
    r.studentName.toLowerCase().includes(q) ||
    r.bookNumber.toLowerCase().includes(q) ||
    r.bookName.toLowerCase().includes(q)
  );
  document.getElementById('savedRecordsTitle').textContent = `Saved Students & Issued Books (${savedRecordsCache.length})`;
  document.getElementById('btnClearAllSaved').classList.toggle('d-none', savedRecordsCache.length === 0);

  const list = document.getElementById('savedRecordsList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="p-4 text-center small text-muted">No saved student entries found.</div>';
    return;
  }

  list.innerHTML = filtered
    .map((r) => `
      <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-2 ${selectedIssueId === r.issueId ? 'bg-primary-subtle' : ''}" style="cursor:pointer" onclick="window.onSelectSaved('${escapeHtml(r.issueId)}')">
        <div class="small">
          <div class="fw-bold">${escapeHtml(r.studentName)} <span class="badge bg-light text-dark border">${escapeHtml(r.studentId)}</span> ${statusBadgeHtml(r.status)}</div>
          <div>${escapeHtml(r.bookName)} (${escapeHtml(r.bookNumber)})</div>
          <div class="text-muted">Start: ${formatDate(r.issueDate)} · Final: ${formatDate(r.dueDate)} · Return: ${r.returnDate ? formatDate(r.returnDate) : 'Not Returned Yet'}</div>
          <div class="fw-semibold ${r.fineAmount > 0 ? 'text-danger' : 'text-success'}">Fine: ₹${r.fineAmount}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); window.onDeleteSaved('${escapeHtml(r.issueId)}')">Delete</button>
      </div>
    `)
    .join('');
}

async function loadSavedRecords() {
  const res = await fetch('/api/records');
  const data = await res.json();
  savedRecordsCache = data.records || [];
  renderSavedRecordsList();
}

window.onSelectSaved = selectSavedRecord;
window.onDeleteSaved = async function (issueId) {
  const res = await fetch(`/api/records/${encodeURIComponent(issueId)}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) return showAlert('error', data.error);
  if (selectedIssueId === issueId) resetToIssueMode();
  showAlert('success', data.message);
  await loadSavedRecords();
};

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  document.getElementById('issueStartDate').value = today;
  document.getElementById('issueDueDate').value = due;

  document.getElementById('issueDueDate').addEventListener('input', () => updateFinePreview('issueDueDate', 'issueReturnDate', 'issueFinePreview'));
  document.getElementById('issueReturnDate').addEventListener('input', () => updateFinePreview('issueDueDate', 'issueReturnDate', 'issueFinePreview'));
  document.getElementById('savedDueDate').addEventListener('input', () => updateFinePreview('savedDueDate', 'savedReturnDate', 'savedFinePreview'));
  document.getElementById('savedReturnDate').addEventListener('input', () => updateFinePreview('savedDueDate', 'savedReturnDate', 'savedFinePreview'));
  document.getElementById('savedSearchInput').addEventListener('input', renderSavedRecordsList);
  document.getElementById('btnBackToIssue').addEventListener('click', resetToIssueMode);

  document.getElementById('btnClearAllSaved').addEventListener('click', async () => {
    const res = await fetch('/api/records', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    resetToIssueMode();
    document.getElementById('issueResultBox').innerHTML = '';
    showAlert('success', data.message);
    await loadSavedRecords();
  });

  document.getElementById('issueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: document.getElementById('issueStudentName').value,
        studentId: document.getElementById('issueStudentId').value,
        bookName: document.getElementById('issueBookName').value,
        bookNumber: document.getElementById('issueBookNumber').value,
        issueDate: document.getElementById('issueStartDate').value,
        dueDate: document.getElementById('issueDueDate').value,
        returnDate: document.getElementById('issueReturnDate').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    if (data.record) {
      document.getElementById('issueResultBox').innerHTML = renderEndResultHtml(data.record);
    }
    e.target.reset();
    document.getElementById('issueStartDate').value = today;
    document.getElementById('issueDueDate').value = due;
    updateFinePreview('issueDueDate', 'issueReturnDate', 'issueFinePreview');
    await loadSavedRecords();
  });

  document.getElementById('savedReturnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedIssueId) return;
    const res = await fetch(`/api/records/${encodeURIComponent(selectedIssueId)}/return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueDate: document.getElementById('savedDueDate').value,
        returnDate: document.getElementById('savedReturnDate').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    if (data.record) {
      document.getElementById('issueResultBox').innerHTML = renderEndResultHtml(data.record);
    }
    await loadSavedRecords();
  });

  loadSavedRecords();
});
