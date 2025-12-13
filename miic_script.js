// Data Management
let participants = [];
let currentSession = "all"; // Default session

// Session Management
function changeSession() {
  const selector = document.getElementById("sessionSelect");
  currentSession = selector.value;
  
  // Refresh displays
  displayChecklist();
  displayTeams();
  updateStats();
  
  // Clear search result
  document.getElementById("searchResult").innerHTML = "";
  document.getElementById("searchInput").value = "";
}

function getFilteredParticipants() {
  return participants.filter(p => {
    if (currentSession === "all") {
      return true;
    }
    return p.session === currentSession;
  });
}

// Load initial data
function loadInitialData() {
  // Initialize participants with data
  participants = initialMiicParticipants.map((p) => ({
    ...p,
    checked: false,
    checkTime: null,
  }));

  // Load saved check-in data from localStorage
  loadCheckInData();

  // Initialize displays
  displayChecklist();
  displayTeams();
  updateStats();

  console.log("Loaded MIIC participants:", participants.length);
}

// Save and Load Check-in Data
function saveCheckInData() {
  const checkInData = participants.map((p) => ({
    id: p.id,
    checked: p.checked,
    checkTime: p.checkTime,
  }));
  localStorage.setItem("miic_checkin_data", JSON.stringify(checkInData));
}

function loadCheckInData() {
  const saved = localStorage.getItem("miic_checkin_data");
  if (saved) {
    const checkInData = JSON.parse(saved);
    participants.forEach((p) => {
      const savedData = checkInData.find((d) => d.id === p.id);
      if (savedData) {
        p.checked = savedData.checked;
        p.checkTime = savedData.checkTime;
      }
    });
  }
}

// Tab Functionality
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active from all buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // Add active class to clicked button
  event.target.closest(".tab-btn").classList.add("active");

  // Update stats when stats tab is shown
  if (tabName === "stats") {
    updateStats();
  }
  
  // Update teams when teams tab is shown
  if (tabName === "teams") {
    displayTeams();
  }
}

// Search Functionality
function searchParticipant() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const resultDiv = document.getElementById("searchResult");

  if (!searchTerm) {
    resultDiv.innerHTML =
      '<div class="no-result">กรุณาพิมพ์ชื่อหรือชื่อทีมที่ต้องการค้นหา</div>';
    return;
  }

  // Use filtered participants based on current session
  const results = getFilteredParticipants().filter((p) =>
    p.name.toLowerCase().includes(searchTerm) ||
    (p.team_name && p.team_name.toLowerCase().includes(searchTerm))
  );

  if (results.length === 0) {
    resultDiv.innerHTML =
      '<div class="no-result">ไม่พบข้อมูลที่ค้นหา</div>';
    return;
  }

  resultDiv.innerHTML = results
    .map((p) => {
      const statusClass = p.status.toLowerCase();
      const educationClass = p.session === 'secondary' ? 'secondary' : 'higher';
      const checkStatus = p.checked
        ? `<div style="color: #10b981; font-weight: 600; margin-top: 10px; font-size: 1.1rem;">✅ เช็คชื่อแล้ว (${p.checkTime})</div>`
        : `<div style="color: #f59e0b; font-weight: 600; margin-top: 10px; font-size: 1.1rem;">⚠️ ยังไม่ได้เช็คชื่อ</div>`;

      return `
            <div class="result-card" style="border-left: 5px solid ${p.checked ? '#10b981' : '#f59e0b'};">
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">${p.name}</h3>
                <div style="margin-bottom: 15px;">
                    <span class="status-badge ${statusClass}" style="font-size: 1rem; padding: 6px 14px;">${p.status}</span>
                    <span class="status-badge ${educationClass}-badge" style="font-size: 0.9rem; padding: 6px 14px; margin-left: 8px;">${p.education_level}</span>
                </div>
                <div style="font-size: 1rem; color: #64748b; margin-bottom: 10px;">
                    <strong>ทีม:</strong> ${p.team_name || "-"} <br>
                    <strong>สถาบัน:</strong> ${p.institution || "-"} <br>
                    <strong>อาจารย์ที่ปรึกษา:</strong> ${p.advisor || "-"}
                </div>
                ${checkStatus}
                ${
                  !p.checked
                    ? `
                    <button onclick="quickCheckIn(${p.id})" style="
                        margin-top: 15px;
                        padding: 15px 40px;
                        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: 1.1rem;
                        cursor: pointer;
                        font-family: 'Prompt', sans-serif;
                        box-shadow: 0 4px 6px rgba(139, 92, 246, 0.2);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">เช็คชื่อเลย</button>
                `
                    : ""
                }
            </div>
`;
    })
    .join("");
}

// Quick check-in from search
function quickCheckIn(id) {
  const participant = participants.find((p) => p.id === id);
  if (participant) {
    toggleCheck(id);
    searchParticipant(); // Refresh search results
  }
}

// Checklist Functionality
function displayChecklist() {
  const container = document.getElementById("checklistContainer");
  const statusFilter = document.getElementById("statusFilter").value;
  const attendanceFilter = document.getElementById("attendanceFilter").value;

  // Use filtered participants based on current session
  let filtered = [...getFilteredParticipants()];

  // Apply status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Apply attendance filter
  if (attendanceFilter === "checked") {
    filtered = filtered.filter((p) => p.checked);
  } else if (attendanceFilter === "unchecked") {
    filtered = filtered.filter((p) => !p.checked);
  }

  // Sort: unchecked first, then by id
  filtered.sort((a, b) => {
    if (a.checked === b.checked) {
      return a.id - b.id;
    }
    return a.checked ? 1 : -1;
  });

  container.innerHTML = filtered
    .map((p) => {
      const statusClass = p.status.toLowerCase();
      const educationClass = p.session === 'secondary' ? 'secondary' : 'higher';
      const checkedClass = p.checked ? "checked" : "";
      const checkIcon = p.checked ? "✓" : "○";
      const checkTime = p.checked
        ? `<div class="check-time">เช็คชื่อแล้ว: ${p.checkTime}</div>`
        : "";

      return `
            <div class="checklist-item ${checkedClass}" onclick="toggleCheck(${p.id})">
                <div class="checklist-header">
                    <div class="checklist-number">${p.id}</div>
                    <div class="check-icon">${checkIcon}</div>
                </div>
                <div class="checklist-name">${p.name}</div>
                <div class="checklist-team">${p.team_name || '-'}</div>
                <div class="checklist-status">
                    <span class="status-badge ${statusClass}">${p.status}</span>
                    <span class="status-badge ${educationClass}-badge" style="font-size: 0.7em;">${p.education_level}</span>
                </div>
                ${checkTime}
            </div>
        `;
    })
    .join("");
}

function toggleCheck(id) {
  const participant = participants.find((p) => p.id === id);
  if (participant) {
    participant.checked = !participant.checked;
    if (participant.checked) {
      const now = new Date();
      participant.checkTime = now.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
      showCheckInSuccess(participant);
    } else {
      participant.checkTime = null;
    }
    saveCheckInData();
    displayChecklist();
    updateStats();

    // If we are in search view, refresh search results to show updated status
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value.trim() !== "") {
      searchParticipant();
    }
  }
}

// Modal Functions
function showCheckInSuccess(participant) {
  const modal = document.getElementById("successModal");
  const nameEl = document.getElementById("modalParticipantName");
  const teamEl = document.getElementById("modalTeamName");
  const statusEl = document.getElementById("modalParticipantStatus");
  const timeEl = document.getElementById("modalCheckTime");

  nameEl.textContent = participant.name;
  teamEl.textContent = `ทีม: ${participant.team_name || '-'}`;
  statusEl.textContent = `${participant.status} | ${participant.education_level}`;
  
  // Reset classes and add new ones
  statusEl.className = "modal-status";
  statusEl.classList.add(participant.status.toLowerCase());
  
  timeEl.textContent = `เวลา: ${participant.checkTime}`;

  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("successModal");
  modal.style.display = "none";
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById("successModal");
  if (event.target == modal) {
    closeModal();
  }
}

function filterChecklist() {
  displayChecklist();
}

// Teams Display
function displayTeams() {
  const container = document.getElementById("teamsContainer");
  const filtered = getFilteredParticipants().filter(p => p.status === 'Competitor');
  
  // Group by team
  const teams = {};
  filtered.forEach(p => {
    const teamKey = `${p.team_num}_${p.session}`;
    if (!teams[teamKey]) {
      teams[teamKey] = {
        team_num: p.team_num,
        team_name: p.team_name,
        education_level: p.education_level,
        session: p.session,
        advisor: p.advisor,
        institution: p.institution,
        members: []
      };
    }
    teams[teamKey].members.push(p);
  });
  
  const teamList = Object.values(teams).sort((a, b) => {
    if (a.session !== b.session) return a.session.localeCompare(b.session);
    return a.team_num - b.team_num;
  });
  
  container.innerHTML = teamList.map(team => {
    const allChecked = team.members.every(m => m.checked);
    const someChecked = team.members.some(m => m.checked);
    const teamStatus = allChecked ? 'complete' : (someChecked ? 'partial' : 'pending');
    const checkedCount = team.members.filter(m => m.checked).length;
    const educationClass = team.session === 'secondary' ? 'secondary' : 'higher';
    
    return `
      <div class="team-card ${teamStatus}">
        <div class="team-header">
          <div class="team-number">ทีมที่ ${team.team_num}</div>
          <span class="status-badge ${educationClass}-badge">${team.education_level}</span>
        </div>
        <h3 class="team-name">${team.team_name}</h3>
        <div class="team-info">
          <div><strong>อาจารย์ที่ปรึกษา:</strong> ${team.advisor}</div>
          <div><strong>สถาบัน:</strong> ${team.institution}</div>
        </div>
        <div class="team-members">
          <div class="members-header">
            <strong>สมาชิก</strong> 
            <span class="member-count">${checkedCount}/${team.members.length} เช็คชื่อแล้ว</span>
          </div>
          ${team.members.map(m => `
            <div class="member-item ${m.checked ? 'checked' : ''}" onclick="toggleCheck(${m.id})">
              <span class="member-check">${m.checked ? '✓' : '○'}</span>
              <span class="member-name">${m.name}</span>
              ${m.checked ? `<span class="member-time">${m.checkTime}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Statistics
function updateStats() {
  const filteredParticipants = getFilteredParticipants();
  const total = filteredParticipants.length;
  const checked = filteredParticipants.filter((p) => p.checked).length;
  const notChecked = total - checked;
  
  // Count unique teams
  const teams = new Set(filteredParticipants.filter(p => p.team_num).map(p => `${p.team_num}_${p.session}`));
  const totalTeams = teams.size;

  document.getElementById("totalParticipants").textContent = total;
  document.getElementById("checkedIn").textContent = checked;
  document.getElementById("notCheckedIn").textContent = notChecked;
  document.getElementById("totalTeams").textContent = totalTeams;

  // Status breakdown
  const statuses = ["Competitor", "Jury"];
  statuses.forEach((status) => {
    const statusLower = status.toLowerCase();
    const statusParticipants = filteredParticipants.filter((p) => p.status === status);
    const statusTotal = statusParticipants.length;
    const statusChecked = statusParticipants.filter((p) => p.checked).length;
    const percentage = statusTotal > 0 ? (statusChecked / statusTotal) * 100 : 0;

    const countEl = document.getElementById(`${statusLower}Count`);
    if (countEl) {
      countEl.textContent = statusTotal;
      document.getElementById(`${statusLower}Total`).textContent = statusTotal;
      document.getElementById(`${statusLower}Checked`).textContent = statusChecked;
      document.getElementById(`${statusLower}Progress`).style.width = `${percentage}%`;
    }
  });
  
  // Education level breakdown
  const educationLevels = [
    { key: 'secondary', session: 'secondary' },
    { key: 'higher', session: 'higher' }
  ];
  
  educationLevels.forEach(({ key, session }) => {
    const eduParticipants = filteredParticipants.filter((p) => p.session === session);
    const eduTotal = eduParticipants.length;
    const eduChecked = eduParticipants.filter((p) => p.checked).length;
    const percentage = eduTotal > 0 ? (eduChecked / eduTotal) * 100 : 0;

    const countEl = document.getElementById(`${key}Count`);
    if (countEl) {
      countEl.textContent = eduTotal;
      document.getElementById(`${key}Total`).textContent = eduTotal;
      document.getElementById(`${key}Checked`).textContent = eduChecked;
      document.getElementById(`${key}Progress`).style.width = `${percentage}%`;
    }
  });
}

// Date and Time
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  document.getElementById("dateTime").textContent = now.toLocaleDateString(
    "th-TH",
    options
  );
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  loadInitialData();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Enter key support for search
  document.getElementById("searchInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      searchParticipant();
    }
  });
});
