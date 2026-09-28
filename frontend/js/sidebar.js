// sidebar.js — injects the sidebar into any page that includes it
function renderSidebar(activePage) {
  const html = `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon"><i class="fa-solid fa-hospital"></i></div>
      <h2>HEALTH-AID<br>CLINIC</h2>
      <span>Management System</span>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-label">Main</div>
      <nav class="sidebar-nav">
        <a href="/pages/dashboard.html" data-page="dashboard"><span class="icon"><i class="fa-solid fa-chart-pie"></i></span> Dashboard</a>
      </nav>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-label">Patients</div>
      <nav class="sidebar-nav">
        <a href="/pages/patients.html" data-page="patients"><span class="icon"><i class="fa-solid fa-user-doctor"></i></span> Patient Records</a>
        <a href="/pages/appointments.html" data-page="appointments"><span class="icon"><i class="fa-solid fa-calendar-days"></i></span> Appointments</a>
      </nav>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-label">Clinical</div>
      <nav class="sidebar-nav">
        <a href="/pages/pharmacy.html" data-page="pharmacy"><span class="icon"><i class="fa-solid fa-pills"></i></span> Pharmacy</a>
        <a href="/pages/laboratory.html" data-page="laboratory"><span class="icon"><i class="fa-solid fa-flask-vial"></i></span> Laboratory</a>
        <a href="/pages/vaccination.html" data-page="vaccination"><span class="icon"><i class="fa-solid fa-syringe"></i></span> Vaccination</a>
      </nav>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-label">Finance & Admin</div>
      <nav class="sidebar-nav">
        <a href="/pages/billing.html" data-page="billing"><span class="icon"><i class="fa-solid fa-file-invoice-dollar"></i></span> Billing</a>
        <a href="/pages/attendance.html" data-page="attendance"><span class="icon"><i class="fa-solid fa-clock"></i></span> Attendance</a>
        <a href="/pages/reports.html" data-page="reports"><span class="icon"><i class="fa-solid fa-chart-line"></i></span> Reports</a>
      </nav>
    </div>

    <div class="sidebar-section" data-admin-only>
      <div class="sidebar-section-label">Admin</div>
      <nav class="sidebar-nav">
        <a href="/pages/staff.html" data-page="staff"><span class="icon"><i class="fa-solid fa-users"></i></span> Staff Management</a>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="user-pill">
        <div class="user-avatar" data-user-avatar>A</div>
        <div class="user-info">
          <div class="user-name" data-user-name>User</div>
          <div class="user-role" data-user-role>Role</div>
        </div>
        <button class="btn-logout" data-action="logout" title="Logout"><i class="fa-solid fa-power-off"></i></button>
      </div>
    </div>
  </aside>`;

  const target = document.getElementById('sidebar-placeholder');
  if (target) target.outerHTML = html;

  // Mark active
  if (activePage) {
    const link = document.querySelector(`.sidebar-nav a[data-page="${activePage}"]`);
    if (link) link.classList.add('active');
  }
}
