// === dashboard.js ===
const API_URL = "https://script.google.com/macros/s/AKfycbz17_iutVR5YQulbalXqL27cjSrFZ3cxYCPYwRov9nureAvq-M_hmQdvkoX89W0ykIZ9A/exec";
const CUTI_API_URL = "https://script.google.com/macros/s/AKfycbxAkmUtnC6BhPs76oiqwfJD0B-oa0C3qsOF3MZ3hTZdwsnAFHiOHBSuJi_jgS26rA0A/exec";     // Untuk input cuti
// Cek login user
const user = JSON.parse(localStorage.getItem("user"));
if (!user || !user.username) {
  location.href = "index.html";
} else {
  document.getElementById("userLabel").textContent = user.nama || user.username;
}

// Tanggal dan waktu real-time
function updateDateTime() {
  const el = document.getElementById("datetime");
  if (!el) return;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  el.textContent = formatter.format(now);
}

// Dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const icon = document.querySelector("#darkToggle i");
  icon.classList.toggle("bi-sun-fill");
  icon.classList.toggle("bi-moon-fill");
}

// Logout user
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
      popup: 'swal-small',
      confirmButton: 'btn btn-danger mx-2',
      cancelButton: 'btn btn-secondary'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Tampilkan loading Swal
      Swal.fire({
        title: 'Logout...',
        text: 'Harap tunggu',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const url = `${API_URL}?action=logout&username=${encodeURIComponent(user.username)}`;
      fetch(url)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            localStorage.removeItem("user");
            window.location.href = "index.html";
          } else {
            Swal.fire('Gagal', 'Logout tidak berhasil.', 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Gagal menghubungi server.', 'error');
        });
    }
  });
}




// Load halaman dinamis SPA
function loadPage(pageName) {
  const contentArea = document.getElementById("contentArea");

  // Highlight menu
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active-link"));
  const links = document.querySelectorAll(`[onclick="loadPage('${pageName}')"]`);
  links.forEach((el) => el.classList.add("active-link"));

  contentArea.classList.add("fade-transition");
  setTimeout(() => {
    contentArea.innerHTML = `
      <div class="text-center my-5">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-2">Memuat halaman <b>${pageName}</b>...</p>
      </div>
    `;

   fetch(`pages/${pageName}.html`)
  .then((res) => {
    if (!res.ok) throw new Error("Halaman tidak ditemukan.");
    return res.text();
  })
  .then((html) => {
    contentArea.innerHTML = html;

    const currentUser = JSON.parse(localStorage.getItem("user"));

    // === Halaman Dashboard ===
    if (pageName === "dashboard" && currentUser) {
      document.getElementById("fotoUserDashboard")?.setAttribute("src", "img/" + currentUser.pic);
      document.getElementById("namaUserDashboard").textContent = currentUser.nama;
      document.getElementById("jabatanUserDashboard").textContent = currentUser.jabatan;
      initCalendar();
    }

    // === Halaman Pengajuan Cuti ===
    if (pageName === "pengajuan" && currentUser) {
      document.getElementById("namaPegawai")?.setAttribute("value", currentUser.nama);

      let fpInstance = null;
      const tanggalInput = document.getElementById("tanggalCuti");
      tanggalInput.disabled = true; // Awalnya nonaktif

      function hitungHariKerja(startDate, endDate) {
        let count = 0;
        const date = new Date(startDate);
        while (date <= endDate) {
          const day = date.getDay();
          if (day !== 0 && day !== 6) count++;
          date.setDate(date.getDate() + 1);
        }
        return count;
      }

      function initFlatpickr(mode = "single") {
        if (fpInstance) fpInstance.destroy();
        tanggalInput.disabled = false;

        fpInstance = flatpickr("#tanggalCuti", {
          mode: mode,
          dateFormat: "Y-m-d",
          onClose: function (selectedDates) {
            const jumlahCutiEl = document.getElementById("jumlahCuti");
            const kodeCutiEl = document.getElementById("kodeCuti");

            if (mode === "range" && selectedDates.length === 2) {
              const hariKerja = hitungHariKerja(selectedDates[0], selectedDates[1]);
              jumlahCutiEl.value = hariKerja;
              kodeCutiEl.value = "CT-" + Date.now().toString().slice(-6);
            } else if (mode === "single" && selectedDates.length === 1) {
              const day = selectedDates[0].getDay();
              if (day === 0 || day === 6) {
                jumlahCutiEl.value = 0;
                kodeCutiEl.value = "";
                Swal.fire("Hari libur!", "Silakan pilih hari kerja.", "info");
              } else {
                jumlahCutiEl.value = 1;
                kodeCutiEl.value = "CT-" + Date.now().toString().slice(-6);
              }
            } else {
              jumlahCutiEl.value = "";
              kodeCutiEl.value = "";
            }
          },
        });
      }

      // Radio button ganti mode
      document.querySelectorAll('input[name="modeTanggal"]').forEach((radio) => {
        radio.addEventListener("change", function () {
          initFlatpickr(this.value);
        });
      });

      // === Submit Form ===
      const formCuti = document.getElementById("formCuti");
      formCuti?.addEventListener("submit", async function (e) {
        e.preventDefault();

        const jenisCuti = document.getElementById("jenisCuti").value;
        const tanggalCuti = document.getElementById("tanggalCuti").value;
        const tanggalRange = tanggalCuti.includes(" to ") ? tanggalCuti.split(" to ") : [tanggalCuti, tanggalCuti];
        const alasan = document.getElementById("alasan").value.trim();
        const alamat = document.getElementById("alamat").value.trim();
        const telpon = document.getElementById("telpon").value.trim();
        const lamaCuti = document.getElementById("jumlahCuti").value;
        const kodeCuti = document.getElementById("kodeCuti").value;

        if (!tanggalCuti || tanggalRange.length !== 2 || lamaCuti === "0") {
          Swal.fire("Oops!", "Tanggal cuti tidak valid atau hari libur.", "warning");
          return;
        }

        const data = {
          action: "addCuti",
          username: currentUser.username,
          nama: currentUser.nama,
          jabatan: currentUser.jabatan,
          tanggal_pengajuan: new Date().toISOString().split("T")[0],
          tanggal_mulai: tanggalRange[0],
          tanggal_selesai: tanggalRange[1],
          lama_cuti: lamaCuti,
          jenis_cuti: jenisCuti,
          alasan: alasan,
          status: "Menunggu",
          tanggal_disetujui: "",
          disetujui_oleh: "",
          alamat: alamat,
          telpon: telpon,
          kode: kodeCuti,
        };

        try {
          Swal.fire({
            title: "Mengirim...",
            text: "Menyimpan data cuti...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const res = await fetch(CUTI_API_URL, {
            method: "POST",
            body: JSON.stringify(data),
          });

          const result = await res.json();
          Swal.close();

          if (result.success) {
            Swal.fire("Berhasil!", "Data cuti berhasil diajukan.", "success");
            formCuti.reset();
            document.getElementById("namaPegawai").value = currentUser.nama;
            tanggalInput.disabled = true;
          } else {
            Swal.fire("Gagal!", "Gagal mengirim data cuti.", "error");
          }
        } catch (err) {
          Swal.close();
          console.error("Submit error:", err);
          Swal.fire("Error", "Gagal terhubung ke server.", "error");
        }
      });
    }

    setTimeout(() => contentArea.classList.remove("fade-transition"), 50);
  })
  .catch(() => {
    contentArea.innerHTML = `<div class='alert alert-danger'>Gagal memuat halaman.</div>`;
    contentArea.classList.remove("fade-transition");
  });

  }, 200);
}

// Kalender cuti
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
  });
  calendar.render();
}

// Sidebar mobile auto-close
function closeSidebarIfMobile(targetElement) {
  const isMobile = window.innerWidth < 768;
  const isInsideSubmenu = targetElement.closest(".has-submenu");
  if (isMobile && !isInsideSubmenu) {
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarOffcanvas"));
    if (offcanvas) offcanvas.hide();
  }
}

// Saat halaman siap
// Tempatkan <script src="dashboard.js"> di akhir <body> agar ini dieksekusi setelah semua elemen dimuat

document.addEventListener("DOMContentLoaded", function () {
  loadPage("dashboard");
  updateDateTime();
  setInterval(updateDateTime, 1000);

  document.querySelectorAll("#sidebarOffcanvas .nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      closeSidebarIfMobile(e.target);
    });
  });

  document.querySelectorAll("#sidebarOffcanvas .submenu a").forEach((link) => {
    link.addEventListener("click", function () {
      const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarOffcanvas"));
      if (offcanvas) offcanvas.hide();
    });
  });

  document.getElementById("darkToggle")?.addEventListener("click", toggleDarkMode);
});
