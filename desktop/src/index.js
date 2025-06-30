// Fetch faculty from backend and render cards
function fetchAndRenderFaculty() {
  fetch("http://localhost:5000/faculty")
    .then((res) => res.json())
    .then((facultyList) => {
      renderFacultyCards(facultyList);
    })
    .catch(() => {
      document.getElementById("dashboard").innerHTML =
        "<div style='padding:2rem;text-align:center;'>Unable to load faculty data.</div>";
    });
}

function renderFacultyCards(facultyList) {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  if (!facultyList || facultyList.length === 0) {
    dashboard.innerHTML =
      "<div style='padding:2rem;text-align:center;'>No faculty found.</div>";
    return;
  }

  facultyList.forEach((f) => {
    // Build card HTML
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-dept", f.department);

    card.innerHTML = `
      <img class="profile-pic" src="${
        f.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(f.first_name + " " + f.last_name)
      }" alt="${f.first_name} ${f.last_name}" />
      <div class="name">${f.first_name} ${f.middle_initial ? f.middle_initial + "." : ""} ${f.last_name}</div>
      <div class="title">${Array.isArray(f.titles) ? f.titles.join(", ") : f.titles || ""}</div>
      <div class="department">${f.department}</div>
      <div class="status">
        <div class="status-dot ${f.status ? f.status.toLowerCase() : "offline"}"></div>
        <span class="status-text">${f.status || "Offline"}</span>
      </div>
    `;
    dashboard.appendChild(card);
  });

  // Re-apply filter after rendering
  applyDeptFilter();
}

// Filter cards by department with persistence
const deptFilter = document.getElementById("dept-filter");

// Restore filter from localStorage if available
const savedDept = localStorage.getItem("selectedDept");
if (savedDept) {
  deptFilter.value = savedDept;
}

function applyDeptFilter() {
  const selected = deptFilter.value;
  // Save selection to localStorage
  localStorage.setItem("selectedDept", selected);
  document.querySelectorAll(".card").forEach((card) => {
    const dept = card.getAttribute("data-dept");
    card.style.display = selected === "all" || dept === selected ? "flex" : "none";
  });
}

deptFilter.addEventListener("change", applyDeptFilter);

// Toggle filter dropdown visibility button
document.getElementById("filterToggleBtn").addEventListener("click", () => {
  deptFilter.style.display = deptFilter.style.display === "block" ? "none" : "block";
});

// Start the clock
function startClock() {
  const clockEl = document.getElementById("current-time");
  function updateClock() {
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    clockEl.textContent = `${dateStr} | ${timeStr}`;
  }
  updateClock();
  setInterval(updateClock, 1000);
}
startClock();

// Initial faculty load
fetchAndRenderFaculty();

// Optional: Poll every 5 seconds for updates (live refresh)
setInterval(fetchAndRenderFaculty, 5000);