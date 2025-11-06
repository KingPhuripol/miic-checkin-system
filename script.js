// Data Management
let participants = [];
let onsiteRegistrations = [];

// Initial participant data from CSV
const initialParticipants = [
  { id: 1, name: "พลอยชมพู กะฐินเทศ", status: "VIP" },
  { id: 2, name: "ณัฐวศา ประมวล", status: "VIP" },
  { id: 3, name: "ชนวีร์ พิมพ์โปร่ง", status: "VIP" },
  { id: 4, name: "ศุภชัย รุ่งแสง", status: "VIP" },
  { id: 5, name: "ตะวัน บู่ทอง", status: "Competitor" },
  { id: 6, name: "อัฑฒกร อาสนเสวตร์", status: "Competitor" },
  { id: 7, name: "นายธนกร บุญเกิดรัมย์", status: "Competitor" },
  { id: 8, name: "นายภูดิส สถานเมือง", status: "Competitor" },
  { id: 9, name: "ภัทรพล ไทยประโคน", status: "Competitor" },
  { id: 10, name: "บุลกิต นพน้อย", status: "Competitor" },
  { id: 11, name: "กฤษดา ดาวลอย", status: "Competitor" },
  { id: 12, name: "ธาวิน ชาวหวายสอ", status: "Competitor" },
  { id: 13, name: "ธนโชติ วิไล", status: "Competitor" },
  { id: 14, name: "ธัญภัค ไชยชาดา", status: "Competitor" },
  { id: 15, name: "รณกฤต งามจันทร์", status: "Competitor" },
  { id: 16, name: "พัชริญา หนุนดี", status: "Visitor" },
  { id: 17, name: "กิรติ โพธิแดง", status: "Visitor" },
  { id: 18, name: "กชพร มูลเมือง", status: "Visitor" },
  { id: 19, name: "ศตายุ ชีวจิตธรรม", status: "Visitor" },
  { id: 20, name: "จิรเดช พัฒน์ถึง", status: "Visitor" },
  { id: 21, name: "นาย ฐาปกรณ์ แซ่เตีย", status: "Visitor" },
  { id: 22, name: "ภูเกริก ภักดีเกษม", status: "Visitor" },
  { id: 23, name: "ชิติพัทธ์ สร้อยสังวาลย์", status: "Visitor" },
  { id: 24, name: "ชาญกสิ วงษา", status: "Visitor" },
  { id: 25, name: "ฐปนัชญ์ อรรถจิราภรณ์", status: "Visitor" },
];

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

  const results = participants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm)
  );

  if (results.length === 0) {
    resultDiv.innerHTML =
      '<div class="no-result">ไม่พบข้อมูลที่ค้นหา<br>คุณสามารถลงทะเบียนหน้างานได้ที่แท็บ "ลงทะเบียนหน้างาน"</div>';
    return;
  }

  resultDiv.innerHTML = results
    .map((p) => {
      const statusClass = p.status.toLowerCase();
      const checkStatus = p.checked
        ? `<div style="color: #10b981; font-weight: 600; margin-top: 10px;">เช็คชื่อแล้ว (${p.checkTime})</div>`
        : `<div style="color: #f59e0b; font-weight: 600; margin-top: 10px;">ยังไม่ได้เช็คชื่อ</div>`;

      return `
            <div class="result-card">
                <h3>${p.name}</h3>
                <div>
                    <span class="status-badge ${statusClass}">${p.status}</span>
                    ${
                      p.onsite
                        ? '<span class="status-badge" style="background: #8b5cf6; margin-left: 10px;">ลงทะเบียนหน้างาน</span>'
                        : ""
                    }
                </div>
                ${checkStatus}
                ${
                  !p.checked
                    ? `
                    <button onclick="quickCheckIn(${p.id})" style="
                        margin-top: 15px;
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: 'Prompt', sans-serif;
                    ">เช็คชื่อเลย</button>
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

// Enter key support for search (moved to main initialization)

// Checklist Functionality
function displayChecklist() {
  const container = document.getElementById("checklistContainer");
  const statusFilter = document.getElementById("statusFilter").value;
  const attendanceFilter = document.getElementById("attendanceFilter").value;

  let filtered = [...participants];

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

  // Sort: unchecked first, then by number
  filtered.sort((a, b) => {
    if (a.checked === b.checked) {
      return a.id - b.id;
    }
    return a.checked ? 1 : -1;
  });

  container.innerHTML = filtered
    .map((p) => {
      const statusClass = p.status.toLowerCase();
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
    } else {
      participant.checkTime = null;
    }
    saveCheckInData();
    displayChecklist();
    updateStats();
  }
}

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
    checked: true, // Auto check-in for onsite registration
    checkTime: new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    onsite: true,
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
  const total = participants.length;
  const checked = participants.filter((p) => p.checked).length;
  const notChecked = total - checked;
  const onsite = onsiteRegistrations.length;

  document.getElementById("totalParticipants").textContent = total;
  document.getElementById("checkedIn").textContent = checked;
  document.getElementById("notCheckedIn").textContent = notChecked;
  document.getElementById("onsiteRegistration").textContent = onsite;

  // Status breakdown
  const statuses = ["VIP", "Competitor", "Visitor"];
  statuses.forEach((status) => {
    const statusLower = status.toLowerCase();
    const statusParticipants = participants.filter((p) => p.status === status);
    const statusTotal = statusParticipants.length;
    const statusChecked = statusParticipants.filter((p) => p.checked).length;
    const percentage =
      statusTotal > 0 ? (statusChecked / statusTotal) * 100 : 0;

    document.getElementById(`${statusLower}Count`).textContent = statusTotal;
    document.getElementById(`${statusLower}Total`).textContent = statusTotal;
    document.getElementById(`${statusLower}Checked`).textContent =
      statusChecked;
    document.getElementById(
      `${statusLower}Progress`
    ).style.width = `${percentage}%`;
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
