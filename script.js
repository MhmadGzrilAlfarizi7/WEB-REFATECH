/* ==========================================================================
   DIAGA — Digitalisasi Aksara Kaganga
   Lead JavaScript · Museum Digital Interaktif
   ==========================================================================
   Modul:
     1. SpaceDustParticles  — Sistem partikel debu luar angkasa (Canvas)
     2. KagangaMapping      — Pemetaan Latin ↔ Aksara Rejang (Unicode)
     3. InteractiveConverter — Konversi real-time #latinInput → #kagangaOutput
     4. GalleryGenerator    — Populasi otomatis #aksaraGrid
     5. GSAPAnimations      — Hero entrance + ScrollTrigger fade-up
     6. TiltInitializer     — VanillaTilt pada .batik-card
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. PEMETAAN AKSARA KAGANGA (Unicode Rejang U+A930–A95F)
   --------------------------------------------------------------------------
   Setiap objek memuat:
     char   → Karakter Unicode Rejang
     latin  → Transliterasi Latin (suku kata dasar)
     bunyi  → Deskripsi pelafalan dalam Bahasa Indonesia
   -------------------------------------------------------------------------- */

const AKSARA_KAGANGA = Object.freeze([
  { char: '\uA930', latin: 'Ka',  bunyi: '"Ka" seperti kata Kala' },
  { char: '\uA931', latin: 'Ga',  bunyi: '"Ga" seperti kata Gajah' },
  { char: '\uA932', latin: 'Nga', bunyi: '"Nga" seperti kata Nganga' },
  { char: '\uA933', latin: 'Ta',  bunyi: '"Ta" seperti kata Tala' },
  { char: '\uA934', latin: 'Da',  bunyi: '"Da" seperti kata Dara' },
  { char: '\uA935', latin: 'Na',  bunyi: '"Na" seperti kata Naga' },
  { char: '\uA936', latin: 'Pa',  bunyi: '"Pa" seperti kata Padi' },
  { char: '\uA937', latin: 'Ba',  bunyi: '"Ba" seperti kata Batu' },
  { char: '\uA938', latin: 'Ma',  bunyi: '"Ma" seperti kata Madu' },
  { char: '\uA939', latin: 'Ca',  bunyi: '"Ca" seperti kata Cakra' },
  { char: '\uA93A', latin: 'Ja',  bunyi: '"Ja" seperti kata Jala' },
  { char: '\uA93B', latin: 'Nya', bunyi: '"Nya" seperti kata Nyala' },
  { char: '\uA93C', latin: 'Sa',  bunyi: '"Sa" seperti kata Satu' },
  { char: '\uA93D', latin: 'Ra',  bunyi: '"Ra" seperti kata Raja' },
  { char: '\uA93E', latin: 'La',  bunyi: '"La" seperti kata Laut' },
  { char: '\uA93F', latin: 'Ya',  bunyi: '"Ya" seperti kata Yakin' },
  { char: '\uA940', latin: 'Wa',  bunyi: '"Wa" seperti kata Waja' },
  { char: '\uA941', latin: 'Ha',  bunyi: '"Ha" seperti kata Hari' },
  { char: '\uA942', latin: 'Mba', bunyi: '"Mba" — konsonan rangkap Mb+a' },
  { char: '\uA943', latin: 'Ngga',bunyi: '"Ngga" — konsonan rangkap Ngg+a' },
  { char: '\uA944', latin: 'Nda', bunyi: '"Nda" — konsonan rangkap Nd+a' }
]);

/**
 * Peta konversi: kunci Latin (lowercase) → karakter Kaganga.
 * Diurutkan menurut panjang kunci terpanjang dahulu agar proses
 * tokenisasi greedy-match berjalan benar (ngga sebelum nga, dst.).
 */
const CONVERSION_MAP = (() => {
  const map = {};
  // Tambahkan peta dari dataset utama
  AKSARA_KAGANGA.forEach(a => { map[a.latin.toLowerCase()] = a.char; });
  return Object.freeze(map);
})();

// Kunci-kunci peta yang diurutkan dari terpanjang ke terpendek
const SORTED_KEYS = Object.keys(CONVERSION_MAP)
  .sort((a, b) => b.length - a.length);


/* --------------------------------------------------------------------------
   2. SPACE DUST PARTICLE SYSTEM (HTML5 Canvas)
   --------------------------------------------------------------------------
   Menciptakan efek debu bintang / partikel melayang dengan nuansa emas
   dan emerald, bergerak perlahan ke atas seolah dalam ruang hampa (zero-g).
   Performant: menggunakan requestAnimationFrame + offscreen check.
   -------------------------------------------------------------------------- */

function initSpaceDustParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  const PARTICLE_COUNT = 80;       // Jumlah debu
  const MAX_RADIUS = 2.2;          // Radius maksimum
  const DRIFT_SPEED = 0.35;        // Kecepatan drift vertikal
  const TWINKLE_RATE = 0.015;      // Kecepatan kedip alpha

  // Palet warna partikel — emas & emerald
  const PALETTE = [
    { r: 212, g: 168, b: 67  },    // Royal Gold
    { r: 255, g: 215, b: 0   },    // Bright Gold
    { r: 184, g: 134, b: 11  },    // Deep Gold
    { r: 0,   g: 232, b: 123 },    // Glow Emerald
    { r: 0,   g: 180, b: 100 },    // Deep Emerald
  ];

  let particles = [];

  /** Sesuaikan ukuran canvas dengan viewport */
  function resize() {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  /** Buat satu partikel baru */
  function createParticle(startAtTop) {
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return {
      x:     Math.random() * width,
      y:     startAtTop ? height + Math.random() * 40 : Math.random() * height,
      vx:    (Math.random() - 0.5) * 0.25,          // Drift horizontal ringan
      vy:    -(Math.random() * DRIFT_SPEED + 0.08),  // Naik perlahan (anti-gravity)
      radius: Math.random() * MAX_RADIUS + 0.4,
      color:  color,
      alpha:  Math.random() * 0.5 + 0.1,
      alphaDir: Math.random() > 0.5 ? 1 : -1,       // Arah kedip
      // Variasi kecepatan kedip per partikel
      twinkleSpeed: TWINKLE_RATE * (0.5 + Math.random()),
    };
  }

  /** Inisialisasi seluruh partikel */
  function seedParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(false));
    }
  }

  /** Loop render utama */
  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Gambar partikel sebagai lingkaran bercahaya
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
      ctx.fill();

      // Tambahan glow halo (radius lebih besar, alpha lebih rendah)
      if (p.radius > 1.2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha * 0.15})`;
        ctx.fill();
      }

      // Update posisi — anti-gravity drift
      p.x += p.vx;
      p.y += p.vy;

      // Efek kedip (twinkle)
      p.alpha += p.alphaDir * p.twinkleSpeed;
      if (p.alpha >= 0.65) { p.alpha = 0.65; p.alphaDir = -1; }
      if (p.alpha <= 0.05) { p.alpha = 0.05; p.alphaDir =  1; }

      // Recycle partikel yang keluar layar
      if (p.y < -20) {
        particles[i] = createParticle(true);
      }
      // Wrap horizontal
      if (p.x < -20) p.x = width + 10;
      if (p.x > width + 20) p.x = -10;
    }

    requestAnimationFrame(render);
  }

  // Bootstrap
  resize();
  window.addEventListener('resize', resize);
  seedParticles();
  render();
}


/* --------------------------------------------------------------------------
   3. GALLERY GENERATOR — Populasi otomatis #aksaraGrid
   --------------------------------------------------------------------------
   Membuat sel aksara dengan class .aksara-cell, lengkap dengan karakter
   Unicode dan label bunyi. Setiap sel punya hover tooltip dan efek klik.
   -------------------------------------------------------------------------- */

function generateGallery() {
  const grid = document.getElementById('aksaraGrid');
  if (!grid) return;

  // Bersihkan isi grid sebelumnya (safety)
  grid.innerHTML = '';

  AKSARA_KAGANGA.forEach((aksara, index) => {
    const cell = document.createElement('div');
    cell.className = 'aksara-cell';
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-label', `Aksara ${aksara.latin}: ${aksara.bunyi}`);
    cell.title = aksara.bunyi;

    // Stagger animation delay berdasarkan posisi
    cell.style.animationDelay = `${(index % 7) * 0.5}s`;

    // Isi sel: karakter besar + label kecil
    cell.innerHTML = `
      <span class="aksara-char">${aksara.char}</span>
      <span class="aksara-label">${aksara.latin}</span>
    `;

    // Efek klik — bounce anti-gravity
    const triggerBounce = () => {
      cell.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
      cell.style.transform = 'translateY(-18px) scale(1.15)';
      setTimeout(() => {
        cell.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        cell.style.transform = '';
      }, 350);
    };

    cell.addEventListener('click', triggerBounce);
    // Aksesibilitas: Enter/Space juga memicu efek
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerBounce();
      }
    });

    grid.appendChild(cell);
  });
}


/* --------------------------------------------------------------------------
   4. INTERACTIVE CONVERTER — Latin → Aksara Kaganga Real-time
   --------------------------------------------------------------------------
   Mendengarkan event 'input' pada #latinInput.
   Menggunakan tokenisasi greedy (terpanjang lebih dulu) agar suku kata
   multi-karakter seperti "ngga", "nga", "nya" terpetakan dengan benar.
   -------------------------------------------------------------------------- */

function initConverter() {
  const input  = document.getElementById('latinInput');
  const output = document.getElementById('kagangaOutput');
  if (!input || !output) return;

  const PLACEHOLDER_HTML = '<span class="text-gray-600 text-lg">Hasil akan muncul di sini...</span>';

  /**
   * Tokenisasi teks Latin menjadi array karakter Kaganga.
   * Proses: greedy match dari kiri ke kanan, prioritas kunci terpanjang.
   */
  function latinToKaganga(text) {
    const lower = text.toLowerCase();
    let result = '';
    let cursor = 0;

    while (cursor < lower.length) {
      let matched = false;

      // Coba cocokkan dari kunci terpanjang ke terpendek
      for (const key of SORTED_KEYS) {
        if (lower.startsWith(key, cursor)) {
          result += CONVERSION_MAP[key];
          cursor += key.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Karakter tidak dikenal — pertahankan apa adanya (spasi, tanda baca, dll.)
        result += lower[cursor];
        cursor++;
      }
    }

    return result;
  }

  /** Handler konversi real-time */
  function handleInput() {
    const raw = input.value.trim();

    if (!raw) {
      output.innerHTML = PLACEHOLDER_HTML;
      output.classList.remove('has-content');
      return;
    }

    const converted = latinToKaganga(raw);
    output.textContent = converted;
    output.classList.add('has-content');
  }

  // Event listeners — 'input' untuk real-time, 'paste' untuk tempel
  input.addEventListener('input', handleInput);
  input.addEventListener('paste', () => {
    // Tunggu sebentar agar value ter-update setelah paste
    requestAnimationFrame(handleInput);
  });
}


/* --------------------------------------------------------------------------
   5. GSAP & SCROLLTRIGGER — Animasi Entrance + Scroll-Driven
   --------------------------------------------------------------------------
   - Hero (.hero-anim): Fade-up stagger saat halaman dimuat.
   - Galeri title + grid: Fade-up + scale saat scroll masuk viewport.
   - History (.history-item): Fade-up individual via ScrollTrigger.
   - Konverter & Koleksi: Fade-up saat scroll.
   -------------------------------------------------------------------------- */

function initGSAPAnimations() {
  // Pastikan GSAP dan ScrollTrigger tersedia
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[DIAGA] GSAP atau ScrollTrigger tidak ditemukan. Animasi dilewati.');
    // Fallback: tampilkan semua elemen yang tersembunyi
    document.querySelectorAll('.hero-anim, .history-item').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ----- 5a. Hero Entrance -----
  // Elemen .hero-anim di-set opacity:0 + translateY(60px) oleh CSS,
  // GSAP menganimasi ke state visible secara stagger.
  const heroTimeline = gsap.timeline({ delay: 0.4 });
  heroTimeline.to('.hero-anim', {
    y: 0,
    opacity: 1,
    duration: 1.2,
    stagger: 0.2,
    ease: 'power3.out',
  });

  // ----- 5b. Galeri Section -----
  // Judul galeri
  gsap.from('.galeri-title', {
    scrollTrigger: {
      trigger: '#galeri',
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power2.out',
  });

  // Aksara cells — stagger dari posisi acak
  gsap.from('.aksara-cell', {
    scrollTrigger: {
      trigger: '#aksaraGrid',
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
    y: 60,
    opacity: 0,
    scale: 0.8,
    duration: 0.6,
    stagger: {
      each: 0.04,
      from: 'random',
    },
    ease: 'back.out(1.7)',
  });

  // ----- 5c. History Items — ScrollTrigger Fade-Up -----
  const historyItems = document.querySelectorAll('.history-item');
  historyItems.forEach((item) => {
    gsap.to(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 88%',
        end: 'top 45%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out',
    });
  });

  // ----- 5d. Konverter Section -----
  gsap.from('#konverter .glass-card', {
    scrollTrigger: {
      trigger: '#konverter',
      start: 'top 78%',
      toggleActions: 'play none none none',
    },
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power2.out',
  });

  // ----- 5e. Batik Cards — Stagger -----
  gsap.from('.batik-card', {
    scrollTrigger: {
      trigger: '#koleksi',
      start: 'top 78%',
      toggleActions: 'play none none none',
    },
    y: 70,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power2.out',
  });

  // ----- 5f. Section Titles (Sejarah, Konverter, Koleksi) -----
  ['#sejarah h2', '#konverter h2', '#koleksi h2'].forEach(selector => {
    const el = document.querySelector(selector);
    if (!el) return;
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power2.out',
    });
  });
}


/* --------------------------------------------------------------------------
   6. VANILLA-TILT INITIALIZER
   --------------------------------------------------------------------------
   Menginisialisasi efek tilt 3D pada semua elemen dengan atribut data-tilt.
   Membaca konfigurasi dari atribut HTML (data-tilt-max, data-tilt-glare, dll.)
   -------------------------------------------------------------------------- */

function initVanillaTilt() {
  if (typeof VanillaTilt === 'undefined') {
    console.warn('[DIAGA] VanillaTilt tidak ditemukan. Efek tilt dilewati.');
    return;
  }

  const tiltElements = document.querySelectorAll('[data-tilt]');
  if (tiltElements.length === 0) return;

  VanillaTilt.init(tiltElements, {
    max:         8,       // Sudut rotasi maksimal (derajat)
    speed:       400,     // Kecepatan transisi (ms)
    glare:       true,    // Efek kilauan
    'max-glare': 0.2,     // Intensitas kilauan
    perspective: 1000,    // Jarak perspektif 3D
    scale:       1.02,    // Sedikit zoom saat tilt
  });
}


/* --------------------------------------------------------------------------
   7. NAVBAR — Scroll Behavior & Mobile Menu
   --------------------------------------------------------------------------
   - Tambah/hapus class .nav-scrolled berdasarkan posisi scroll.
   - Toggle mobile menu dengan animasi.
   -------------------------------------------------------------------------- */

function initNavbar() {
  const navbar     = document.getElementById('navbar');
  const menuBtn    = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!navbar || !menuBtn || !mobileMenu) return;

  // Navbar glassmorphic saat di-scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('nav-scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Toggle mobile menu
  menuBtn.addEventListener('click', () => {
    const isOpen = !mobileMenu.classList.contains('hidden');
    if (isOpen) {
      mobileMenu.classList.add('hidden');
      mobileMenu.classList.remove('flex');
      menuBtn.textContent = '☰';
      menuBtn.setAttribute('aria-expanded', 'false');
    } else {
      mobileMenu.classList.remove('hidden');
      mobileMenu.classList.add('flex');
      menuBtn.textContent = '✕';
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Tutup mobile menu saat link diklik
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      mobileMenu.classList.remove('flex');
      menuBtn.textContent = '☰';
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}


/* --------------------------------------------------------------------------
   8. BOOTSTRAP — Inisialisasi Semua Modul
   -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Modul 1: Partikel latar belakang
  initSpaceDustParticles();

  // Modul 2: Galeri aksara (harus sebelum GSAP agar elemen sudah ada)
  generateGallery();

  // Modul 3: Konverter aksara real-time
  initConverter();

  // Modul 4: Navigasi
  initNavbar();

  // Modul 5: Vanilla Tilt untuk batik cards
  initVanillaTilt();

  // Modul 6: GSAP & ScrollTrigger — sedikit delay agar DOM stabil
  requestAnimationFrame(() => {
    setTimeout(initGSAPAnimations, 80);
  });
});
