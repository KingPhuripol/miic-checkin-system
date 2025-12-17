// Data Management
let participants = [];
let onsiteRegistrations = [];
let currentSession = "17_all"; // Default session

// Initial participant data is loaded from data.js

// Session Management
function changeSession() {
  const selector = document.getElementById("sessionSelect");
  currentSession = selector.value;

  // Refresh displays
  displayChecklist();
  updateStats();

  // Clear search result
  document.getElementById("searchResult").innerHTML = "";
  document.getElementById("searchInput").value = "";
}

function getFilteredParticipants() {
  return participants.filter((p) => {
    if (currentSession === "all_sessions") {
      return true;
    }
    if (currentSession === "17_all") {
      return p.session && p.session.startsWith("17");
    }
    return p.session === currentSession;
  });
}

// Load initial data
function loadInitialData() {
  // Initialize participants with data
  participants = initialParticipants.map((p) => ({
    ...p,
    checked: false,
    checkTime: null,
    onsite: false,
  }));

  // Load saved check-in data from localStorage
  loadCheckInData();

  // Initialize displays
  displayChecklist();
  updateStats();

  console.log("Loaded participants:", participants.length);
}

// Save and Load Check-in Data
function saveCheckInData() {
  const checkInData = participants.map((p) => ({
    id: p.id,
    checked: p.checked,
    checkTime: p.checkTime,
  }));
  localStorage.setItem("miic_checkin_data", JSON.stringify(checkInData));
  localStorage.setItem(
    "miic_onsite_registrations",
    JSON.stringify(onsiteRegistrations)
  );
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

  const savedOnsite = localStorage.getItem("miic_onsite_registrations");
  if (savedOnsite) {
    onsiteRegistrations = JSON.parse(savedOnsite);
    // Add onsite registrations to participants
    onsiteRegistrations.forEach((reg) => {
      if (!participants.find((p) => p.id === reg.id)) {
        participants.push(reg);
      }
    });
  }
}

// Tab Management
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active class from all buttons
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
}

// Helper to determine status class
function getStatusClass(status) {
  const s = status.toLowerCase();
  if (s.includes('vip')) return 'vip';
  if (s.includes('speaker')) return 'vip';
  if (s.includes('competitor')) return 'competitor';
  if (s.includes('jury')) return 'jury';
  return 'visitor';
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
      '<div class="no-result">กรุณาพิมพ์ชื่อที่ต้องการค้นหา</div>';
    return;
  }

  // Use filtered participants based on current session
  const results = getFilteredParticipants().filter((p) =>
    p.name.toLowerCase().includes(searchTerm)
  );

  if (results.length === 0) {
    resultDiv.innerHTML =
      '<div class="no-result">ไม่พบข้อมูลที่ค้นหาในรอบนี้<br>คุณสามารถลงทะเบียนหน้างานได้ที่แท็บ "ลงทะเบียนหน้างาน"</div>';
    return;
  }

  resultDiv.innerHTML = results
    .map((p) => {
      const statusClass = getStatusClass(p.status);
      const checkStatus = p.checked
        ? `<div style="color: #10b981; font-weight: 600; margin-top: 10px; font-size: 1.1rem;">✅ เช็คชื่อแล้ว (${p.checkTime})</div>`
        : `<div style="color: #f59e0b; font-weight: 600; margin-top: 10px; font-size: 1.1rem;">⚠️ ยังไม่ได้เช็คชื่อ</div>`;

      return `
            <div class="result-card" style="border-left: 5px solid ${
              p.checked ? "#10b981" : "#f59e0b"
            };">
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">${
                  p.name
                }</h3>
                <div style="margin-bottom: 15px;">
                    <span class="status-badge ${statusClass}" style="font-size: 1.2rem; padding: 8px 16px;">${
        p.status
      }</span>
                    ${
                      p.onsite
                        ? '<span class="status-badge" style="background: #8b5cf6; margin-left: 10px; font-size: 1rem;">ลงทะเบียนหน้างาน</span>'
                        : ""
                    }
                </div>
                <div style="font-size: 1rem; color: #64748b; margin-bottom: 10px;">
                    <strong>สังกัด:</strong> ${p.org || "-"} <br>
                    <strong>หมายเหตุ:</strong> ${p.note || "-"}
                </div>
                ${checkStatus}
                ${
                  !p.checked
                    ? `
                    <button onclick="quickCheckIn(${p.id})" style="
                        margin-top: 15px;
                        padding: 15px 40px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: 1.1rem;
                        cursor: pointer;
                        font-family: 'Prompt', sans-serif;
                        box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">เช็คชื่อเลย</button>
                `
                    : ""
                }
            </div>
`;
    })
    .join("");
} // Quick check-in from search
function quickCheckIn(id) {
  const participant = participants.find((p) => p.id === id);
  if (participant) {
    toggleCheck(id);
    searchParticipant(); // Refresh search results
  }
}

// Enter key support for search (moved to main initialization)

// Checklist Functionality
function displayChecklist() {
  const container = document.getElementById("checklistContainer");
  const statusFilter = document.getElementById("statusFilter").value;
  const attendanceFilter = document.getElementById("attendanceFilter").value;

  // Use filtered participants based on current session
  let filtered = [...getFilteredParticipants()];

  // Apply status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status.toLowerCase().includes(statusFilter.toLowerCase()));
  }

  // Apply attendance filter
  if (attendanceFilter === "checked") {
    filtered = filtered.filter((p) => p.checked);
  } else if (attendanceFilter === "unchecked") {
    filtered = filtered.filter((p) => !p.checked);
  }

  // Sort: unchecked first, then by number
  filtered.sort((a, b) => {
    if (a.checked === b.checked) {
      return a.id - b.id;
    }
    return a.checked ? 1 : -1;
  });

  container.innerHTML = filtered
    .map((p) => {
      const statusClass = getStatusClass(p.status);
      const checkedClass = p.checked ? "checked" : "";
      const checkIcon = p.checked ? "✓" : "○";
      const checkTime = p.checked
        ? `<div class="check-time">เช็คชื่อแล้ว: ${p.checkTime}</div>`
        : "";

      return `
            <div class="checklist-item ${checkedClass}" onclick="toggleCheck(${
        p.id
      })">
                <div class="checklist-header">
                    <div class="checklist-number">${p.id}</div>
                    <div class="check-icon">${checkIcon}</div>
                </div>
                <div class="checklist-name">${p.name}</div>
                <div class="checklist-status">
                    <span class="status-badge ${statusClass}">${p.status}</span>
                    ${
                      p.onsite
                        ? '<span class="status-badge" style="background: #8b5cf6; margin-left: 5px; font-size: 0.75em;">หน้างาน</span>'
                        : ""
                    }
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
  const statusEl = document.getElementById("modalParticipantStatus");
  const timeEl = document.getElementById("modalCheckTime");

  nameEl.textContent = participant.name;
  statusEl.textContent = participant.status;

  // Reset classes and add new ones
  statusEl.className = "modal-status";
  statusEl.classList.add(getStatusClass(participant.status));

  timeEl.textContent = `เวลา: ${participant.checkTime}`;

  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("successModal");
  modal.style.display = "none";
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("successModal");
  if (event.target == modal) {
    closeModal();
  }
};

function filterChecklist() {
  displayChecklist();
}

// Registration Functionality (moved to main initialization)

function registerOnsite() {
  const name = document.getElementById("registerName").value.trim();
  const status = document.getElementById("registerStatus").value;
  const email = document.getElementById("registerEmail").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();
  const organization = document
    .getElementById("registerOrganization")
    .value.trim();

  if (!name || !status) {
    alert("กรุณากรอกข้อมูลที่จำเป็น (ชื่อ-นามสกุล และ Status)");
    return;
  }

  // Generate new ID
  const newId =
    participants.length > 0
      ? Math.max(...participants.map((p) => p.id)) + 1
      : 1;

  const newParticipant = {
    id: newId,
    name: name,
    status: status,
    email: email,
    phone: phone,
    organization: organization,
    checked: true, // Auto check-in
    checkTime: new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    onsite: true,
    session: currentSession, // Assign current session
  };

  participants.push(newParticipant);
  onsiteRegistrations.push(newParticipant);

  saveCheckInData();
  displayChecklist();
  updateStats();

  // Show success message
  const successDiv = document.getElementById("registerSuccess");
  successDiv.innerHTML = `
        <strong>ลงทะเบียนสำเร็จ!</strong><br>
        <div style="margin-top: 10px;">
            <strong>${name}</strong><br>
            Status: ${status}<br>
            เช็คชื่อเรียบร้อยแล้ว
        </div>
    `;
  successDiv.style.display = "block";

  // Reset form
  document.getElementById("registerForm").reset();

  // Hide success message after 5 seconds
  setTimeout(() => {
    successDiv.style.display = "none";
  }, 5000);
}

// Statistics
function updateStats() {
  const filteredParticipants = getFilteredParticipants();
  const total = filteredParticipants.length;
  const checked = filteredParticipants.filter((p) => p.checked).length;
  const notChecked = total - checked;
  const onsite = filteredParticipants.filter((p) => p.onsite).length;

  document.getElementById("totalParticipants").textContent = total;
  document.getElementById("checkedIn").textContent = checked;
  document.getElementById("notCheckedIn").textContent = notChecked;
  document.getElementById("onsiteRegistration").textContent = onsite;

  // Status breakdown
  const statuses = ["VIP", "Competitor", "Visitor"];
  statuses.forEach((status) => {
    const statusLower = status.toLowerCase();
    const statusParticipants = filteredParticipants.filter(
      (p) => p.status.toLowerCase().includes(statusLower)
    );
    const statusTotal = statusParticipants.length;
    const statusChecked = statusParticipants.filter((p) => p.checked).length;
    const percentage =
      statusTotal > 0 ? (statusChecked / statusTotal) * 100 : 0;

    const countEl = document.getElementById(`${statusLower}Count`);
    if (countEl) {
      countEl.textContent = statusTotal;
      document.getElementById(`${statusLower}Total`).textContent = statusTotal;
      document.getElementById(`${statusLower}Checked`).textContent =
        statusChecked;
      document.getElementById(
        `${statusLower}Progress`
      ).style.width = `${percentage}%`;
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
  const dateTimeStr = now.toLocaleDateString("th-TH", options);
  document.getElementById("dateTime").textContent = dateTimeStr;
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Load initial data
  loadInitialData();

  // Update date/time
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Setup search input enter key
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchParticipant();
      }
    });
  }

  // Setup registration form
  const form = document.getElementById("registerForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      registerOnsite();
    });
  }
});

// Export functionality (optional)
function exportData() {
  const data = {
    participants: participants,
    onsiteRegistrations: onsiteRegistrations,
    exportDate: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `miic-checkin-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
