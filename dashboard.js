// === Konstanta API ===
const API_URL = "https://script.google.com/macros/s/AKfycbz17_iutVR5YQulbalXqL27cjSrFZ3cxYCPYwRov9nureAvq-M_hmQdvkoX89W0ykIZ9A/exec";
const CUTI_API_URL = "https://script.google.com/macros/s/AKfycbxAkmUtnC6BhPs76oiqwfJD0B-oa0C3qsOF3MZ3hTZdwsnAFHiOHBSuJi_jgS26rA0A/exec";

// === Autentikasi ===
const user = JSON.parse(localStorage.getItem("user"));
if (!user || !user.username) location.href = "index.html";
else document.getElementById("userLabel").textContent = user.nama || user.username;

// === Jam real-time ===
function updateDateTime() {
  const el = document.getElementById("datetime");
  if (el) {
    el.textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date());
  }
}

// === Dark Mode ===
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = document.querySelector("#darkToggle i");
  if (icon) {
    icon.classList.toggle("bi-sun-fill");
    icon.classList.toggle("bi-moon-fill");
  }
}

// === Logout ===
function logout() {
  Swal.fire({
    title: 'Keluar dari aplikasi?',
    text: 'Anda akan kembali ke halaman login.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, keluar',
    cancelButtonText: 'Batal',
    buttonsStyling: false,
    customClass: {
      confirmButton: 'btn btn-danger mx-2',
      cancelButton: 'btn btn-secondary',
      popup: 'swal-small'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Logout...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      fetch(`${API_URL}?action=logout&username=${encodeURIComponent(user.username)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.removeItem("user");
            location.href = "index.html";
          } else Swal.fire('Gagal', 'Logout tidak berhasil.', 'error');
        }).catch(() => Swal.fire('Error', 'Gagal menghubungi server.', 'error'));
    }
  });
}

// === Hitung Hari Kerja ===
function hitungHariKerja(start, end) {
  let count = 0;
  const date = new Date(start);
  while (date <= end) {
    if (![0, 6].includes(date.getDay())) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

// === Kalender Cuti ===
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    locale: "id",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,listMonth" },
    events: (info, success, fail) => {
      fetch(`${CUTI_API_URL}?action=getCuti`)
        .then(res => res.json())
        .then(data => {
          const events = data
            .filter(i => i.Username === user.username && i.Status !== "Ditolak")
            .map(i => ({
              title: i["Jenis Cuti"],
              start: i["Tanggal Mulai"],
              end: new Date(new Date(i["Tanggal Selesai"]).getTime() + 86400000).toISOString().split("T")[0],
              color: i.Status === "Menunggu" ? "#ffc107" : "#198754"
            }));
          success(events);
        }).catch(fail);
    }
  }).render();
}

// === Riwayat Cuti ===
function loadRiwayatCuti() {
  const el = document.getElementById("riwayatCuti");
  if (!el) return;

  el.innerHTML = `<tr><td colspan="3"><div class="text-muted">Memuat data...</div></td></tr>`;

  fetch(`${CUTI_API_URL}?action=getCuti`)
    .then(res => res.json())
    .then(data => {
      const list = data
        .filter(i => i.Username === user.username)
        .sort((a, b) => new Date(b["Tanggal Pengajuan"]) - new Date(a["Tanggal Pengajuan"]))
        .slice(0, 5);

      el.innerHTML = list.length ? list.map(i => {
        const tgl = new Date(i["Tanggal Pengajuan"]).toLocaleDateString("id-ID", {
          day: "2-digit", month: "long", year: "numeric"
        });
        const badge = i.Status === "Menunggu" ? "bg-warning text-dark" :
                      i.Status === "Disetujui" ? "bg-success" : "bg-danger";
        return `<tr><td>${tgl}</td><td>${i["Jenis Cuti"]}</td><td><span class="badge ${badge}">${i.Status}</span></td></tr>`;
      }).join("") : `<tr><td colspan="3" class="text-muted">Belum ada pengajuan cuti</td></tr>`;
    }).catch(err => {
      console.error(err);
      el.innerHTML = `<tr><td colspan="3" class="text-danger">Gagal memuat data.</td></tr>`;
    });
}

// === SPA Loader ===
function loadPage(page) {
  const content = document.getElementById("contentArea");
  document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active-link"));
  document.querySelectorAll(`[onclick="loadPage('${page}')"]`).forEach(link => link.classList.add("active-link"));

  content.classList.add("fade-transition");
  setTimeout(() => {
    content.innerHTML = `
      <div class="text-center my-5">
        <div class="spinner-border text-success"></div>
        <p class="mt-2">Memuat halaman <b>${page}</b>...</p>
      </div>
    `;
    fetch(`pages/${page}.html`)
      .then(res => res.ok ? res.text() : Promise.reject())
      .then(html => {
        content.innerHTML = html;
        if (page === "dashboard") {
          document.getElementById("fotoUserDashboard")?.setAttribute("src", "img/" + user.pic);
          document.getElementById("namaUserDashboard").textContent = user.nama;
          document.getElementById("jabatanUserDashboard").textContent = user.jabatan;
          initCalendar();
          loadRiwayatCuti();
        }

        if (page === "pengajuan") {
          document.getElementById("namaPegawai")?.setAttribute("value", user.nama);
          const tanggalInput = document.getElementById("tanggalCuti");
          let fp = null;

          const jumlahCutiEl = document.getElementById("jumlahCuti");
          const kodeCutiEl = document.getElementById("kodeCuti");

          function initFlatpickr(mode = "single") {
            if (fp) fp.destroy();
            tanggalInput.disabled = false;
            fp = flatpickr("#tanggalCuti", {
              mode,
              dateFormat: "Y-m-d",
              onClose(selected) {
                const [start, end] = selected;
                if (mode === "range" && selected.length === 2) {
                  jumlahCutiEl.value = hitungHariKerja(start, end);
                } else if (mode === "single" && selected.length === 1) {
                  const day = start.getDay();
                  if (day === 0 || day === 6) {
                    jumlahCutiEl.value = 0;
                    kodeCutiEl.value = "";
                    Swal.fire("Hari libur!", "Silakan pilih hari kerja.", "info");
                    return;
                  }
                  jumlahCutiEl.value = 1;
                } else {
                  jumlahCutiEl.value = "";
                  return;
                }
                kodeCutiEl.value = "CT-" + Date.now().toString().slice(-6);
              }
            });
          }

          document.querySelectorAll('input[name="modeTanggal"]').forEach(r => {
            r.addEventListener("change", () => initFlatpickr(r.value));
          });

          const form = document.getElementById("formCuti");
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const tanggalVal = tanggalInput.value;
            const range = tanggalVal.includes(" to ") ? tanggalVal.split(" to ") : [tanggalVal, tanggalVal];
            const lama = parseInt(jumlahCutiEl.value);

            if (!tanggalVal || lama === 0) {
              Swal.fire("Oops!", "Tanggal cuti tidak valid atau hari libur.", "warning");
              return;
            }

            const data = {
              action: "addCuti",
              username: user.username,
              nama: user.nama,
              jabatan: user.jabatan,
              tanggal_pengajuan: new Date().toISOString().split("T")[0],
              tanggal_mulai: range[0],
              tanggal_selesai: range[1],
              lama_cuti: lama,
              jenis_cuti: document.getElementById("jenisCuti").value,
              alasan: document.getElementById("alasan").value.trim(),
              alamat: document.getElementById("alamat").value.trim(),
              telpon: document.getElementById("telpon").value.trim(),
              kode: kodeCutiEl.value,
              status: "Menunggu",
              tanggal_disetujui: "",
              disetujui_oleh: ""
            };

            Swal.fire({ title: "Mengirim...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
              const res = await fetch(CUTI_API_URL, {
                method: "POST", body: JSON.stringify(data)
              });
              const result = await res.json();
              Swal.close();

              if (result.success) {
                Swal.fire("Berhasil!", "Data cuti berhasil diajukan.", "success");
                form.reset();
                tanggalInput.disabled = true;
              } else Swal.fire("Gagal!", "Gagal mengirim data cuti.", "error");
            } catch (err) {
              console.error(err);
              Swal.close();
              Swal.fire("Error", "Gagal terhubung ke server.", "error");
            }
          });
        }

        setTimeout(() => content.classList.remove("fade-transition"), 100);
      })
      .catch(() => {
        content.innerHTML = `<div class="alert alert-danger">Gagal memuat halaman.</div>`;
        content.classList.remove("fade-transition");
      });
  }, 200);
}

// === Sidebar Mobile Auto-close ===
function closeSidebarIfMobile(target) {
  if (window.innerWidth < 768 && !target.closest(".has-submenu")) {
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarOffcanvas"));
    if (offcanvas) offcanvas.hide();
  }
}

// === Init ===
document.addEventListener("DOMContentLoaded", () => {
  loadPage("dashboard");
  updateDateTime();
  setInterval(updateDateTime, 1000);

  document.querySelectorAll("#sidebarOffcanvas .nav-link").forEach(link => {
    link.addEventListener("click", (e) => closeSidebarIfMobile(e.target));
  });

  document.querySelectorAll("#sidebarOffcanvas .submenu a").forEach(link => {
    link.addEventListener("click", () => {
      const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarOffcanvas"));
      if (offcanvas) offcanvas.hide();
    });
  });

  document.getElementById("darkToggle")?.addEventListener("click", toggleDarkMode);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
});
