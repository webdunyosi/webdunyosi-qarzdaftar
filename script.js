// Autentifikatsiyani tekshirish
function checkAuth() {
  const currentUser = sessionStorage.getItem("currentUser")
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }
  return JSON.parse(currentUser)
}

// Telegram bot konfiguratsiyasi
const TELEGRAM_BOT_TOKEN = "7972518235:AAEIhLp-LVENoe5DCweerO8l-9oK5KFZyRw"
const TELEGRAM_CHAT_ID = "-1002294610813"

// Telegram orqali xabar yuborish
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram bot token yoki chat ID kiritilmagan!")
    return
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    )

    if (!response.ok) {
      throw new Error("Telegram xabari yuborilmadi")
    }
  } catch (error) {
    console.error("Telegram xabari yuborishda xatolik:", error)
  }
}

// Joriy foydalanuvchini tekshirish
const currentUser = checkAuth()

// Agar foydalanuvchi oddiy user bo'lsa, tahrirlash tugmalarini yashirish
if (currentUser.role === "user") {
  document.querySelectorAll(".edit-buttons").forEach((button) => {
    button.style.display = "none"
  })
}

// Qarzlar ma'lumotlarini saqlash uchun
let qarzlar = []
let tahrirlanayotganId = null

// DOM elementlarini topib olish
const qarzForm = document.getElementById("qarzForm")
const qarzlarRoyxati = document.getElementById("qarzlarRoyxati")
const searchInput = document.getElementById("searchInput")
const totalCustomers = document.getElementById("totalCustomers")
const totalDebt = document.getElementById("totalDebt")
const overdueDebts = document.getElementById("overdueDebts")
const submitBtn = document.querySelector('button[type="submit"]')

// Input maydonlarini topib olish
const inputFields = {
  mijozIsmi: document.getElementById("mijozIsmi"),
  telefon: document.getElementById("telefon"),
  mahsulot: document.getElementById("mahsulot"),
  qarzMiqdori: document.getElementById("qarzMiqdori"),
  sana: document.getElementById("sana"),
  tolashMuddati: document.getElementById("tolashMuddati"),
}

// Raqamlarni formatlash
function formatNumber(input) {
  // Faqat raqamlar va bitta nuqtani qoldirish
  let value = input.value.replace(/[^\d.]/g, "")

  // Faqat bitta nuqta bo'lishini ta'minlash
  const parts = value.split(".")
  if (parts.length > 2) {
    value = parts[0] + "." + parts.slice(1).join("")
  }

  // Raqamlarni mingliklarga ajratish (nuqta qoldirilib, vergul qo'shiladi)
  // Oldingi vergullarni olib tashlash va raqamga aylantirish
  const num = parseFloat(value.replace(/,/g, ""))

  if (!isNaN(num)) {
    // toLocaleString() orqali formatlash
    input.value = num.toLocaleString("en-US")
  } else {
    input.value = value // Agar raqam bo'lmasa, kiritilgan qiymatni qoldiramiz
  }
}

// Mahsulot tanlash uchun maxsus funksiya
function handleProductSelection() {
  const mahsulotSelect = inputFields.mahsulot
  const customProductDiv = document.createElement("div")
  customProductDiv.id = "customProductDiv"
  customProductDiv.className = "form-group mt-2"
  customProductDiv.innerHTML = `
    <label class="block text-sm font-medium text-gray-700">
      <i class="fas fa-edit mr-2"></i>Boshqa mahsulot nomi
    </label>
    <input
      class="w-full p-2 rounded-full px-4"
      type="text"
      id="customProduct"
      placeholder="Mahsulot nomini kiriting"
    />
  `

  mahsulotSelect.addEventListener("change", function () {
    const existingCustomDiv = document.getElementById("customProductDiv")
    if (this.value === "Boshqa") {
      if (!existingCustomDiv) {
        this.parentNode.insertAdjacentElement("afterend", customProductDiv)
      }
    } else {
      if (existingCustomDiv) {
        existingCustomDiv.remove()
      }
    }
  })
}

// Formadagi ma'lumotlarni saqlash
function saveFormData() {
  const formData = {}
  for (let field in inputFields) {
    formData[field] = inputFields[field].value
  }
  localStorage.setItem("formData", JSON.stringify(formData))
}

// Formadagi ma'lumotlarni qayta tiklash
function restoreFormData() {
  const savedData = localStorage.getItem("formData")
  if (savedData) {
    const formData = JSON.parse(savedData)
    for (let field in formData) {
      if (inputFields[field]) {
        inputFields[field].value = formData[field]
      }
    }
  }
}

// Input maydonlari o'zgarganida ma'lumotlarni saqlash
for (let field in inputFields) {
  inputFields[field].addEventListener("input", saveFormData)
}

// Statistikani yangilash
function updateStats() {
  // Jami mijozlar (unique mijozlar soni)
  const uniqueCustomers = new Set(qarzlar.map((qarz) => qarz.mijozIsmi)).size
  totalCustomers.textContent = uniqueCustomers

  // Jami qarzlar summasi
  const totalDebtAmount = qarzlar
    .filter((qarz) => qarz.status === "To'lanmagan")
    .reduce((sum, qarz) => sum + qarz.qarzMiqdori, 0)
  totalDebt.textContent = totalDebtAmount.toLocaleString() + " so'm"

  // Muddati o'tgan qarzlar soni
  const today = new Date()
  const overdue = qarzlar.filter(
    (qarz) =>
      new Date(qarz.tolashMuddati) < today && qarz.status === "To'lanmagan"
  ).length
  overdueDebts.textContent = overdue
}

// Formani tozalash va tahrirlash rejimini o'chirish
function resetForm() {
  qarzForm.reset()
  localStorage.removeItem("formData")
  tahrirlanayotganId = null
  submitBtn.textContent = "Qarzni saqlash"
  submitBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-600")
  submitBtn.classList.add("bg-blue-500", "hover:bg-blue-600")
}

// Qarzni tahrirlash
async function qarzniTahrirlash(id) {
  try {
    const doc = await db.collection("debts").doc(id).get()
    const qarz = doc.data()

    if (qarz) {
      tahrirlanayotganId = id

      // Form maydonlarini to'ldirish
      inputFields.mijozIsmi.value = qarz.mijozIsmi
      inputFields.telefon.value = qarz.telefon
      inputFields.mahsulot.value = qarz.mahsulot
      inputFields.qarzMiqdori.value = qarz.qarzMiqdori
      inputFields.sana.value = qarz.sana
      inputFields.tolashMuddati.value = qarz.tolashMuddati

      // Tugma matnini o'zgartirish
      submitBtn.textContent = "O'zgarishlarni saqlash"
      submitBtn.classList.remove("bg-blue-500", "hover:bg-blue-600")
      submitBtn.classList.add("bg-yellow-500", "hover:bg-yellow-600")

      // Formaga fokus qilish
      inputFields.mijozIsmi.focus()

      // Formaga scroll qilish
      qarzForm.scrollIntoView({ behavior: "smooth" })
    }
  } catch (error) {
    console.error("Xatolik yuz berdi:", error)
    alert("Qarzni tahrirlashda xatolik yuz berdi.")
  }
}

// Formani yuborish
qarzForm.addEventListener("submit", async function (e) {
  e.preventDefault()

  // Forma ma'lumotlarini tekshirish
  if (
    !inputFields.mijozIsmi.value ||
    !inputFields.telefon.value ||
    !inputFields.mahsulot.value ||
    !inputFields.qarzMiqdori.value ||
    !inputFields.sana.value ||
    !inputFields.tolashMuddati.value
  ) {
    alert("Iltimos, barcha maydonlarni to'ldiring!")
    return
  }

  try {
    const yangiMalumot = {
      mijozIsmi: inputFields.mijozIsmi.value,
      telefon: inputFields.telefon.value,
      mahsulot: inputFields.mahsulot.value,
      qarzMiqdori: parseFloat(inputFields.qarzMiqdori.value.replace(/,/g, "")),
      sana: inputFields.sana.value,
      tolashMuddati: inputFields.tolashMuddati.value,
      status: "To'lanmagan",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }

    if (tahrirlanayotganId) {
      // Mavjud qarzni yangilash
      await db.collection("debts").doc(tahrirlanayotganId).update(yangiMalumot)
      alert("Qarz ma'lumotlari muvaffaqiyatli yangilandi!")

      // Telegram xabari
      const message = `🔄 <b>Qarz yangilandi</b>\n\n👤 Mijoz: ${
        yangiMalumot.mijozIsmi
      }\n📞 Telefon: ${yangiMalumot.telefon}\n👕 Mahsulot: ${
        yangiMalumot.mahsulot
      }\n💰 Qarz miqdori: ${yangiMalumot.qarzMiqdori.toLocaleString(
        "en-US"
      )} so'm\n📅 Sana: ${yangiMalumot.sana}\n⏰ To'lash muddati: ${
        yangiMalumot.tolashMuddati
      }`
      sendTelegramMessage(message)
    } else {
      // Yangi qarz qo'shish
      await db.collection("debts").add(yangiMalumot)
      alert("Yangi qarz muvaffaqiyatli qo'shildi!")

      // Telegram xabari
      const message = `✅ <b>Yangi qarz qo'shildi</b>\n\n👤 Mijoz: ${
        yangiMalumot.mijozIsmi
      }\n📞 Telefon: ${yangiMalumot.telefon}\n👕 Mahsulot: ${
        yangiMalumot.mahsulot
      }\n💰 Qarz miqdori: ${yangiMalumot.qarzMiqdori.toLocaleString(
        "en-US"
      )} so'm\n📅 Sana: ${yangiMalumot.sana}\n⏰ To'lash muddati: ${
        yangiMalumot.tolashMuddati
      }`
      sendTelegramMessage(message)
    }

    // Formani tozalash
    resetForm()

    // Ro'yxatni yangilash
    await qarzlarniKorsatish()
    updateStats()
  } catch (error) {
    console.error("Xatolik yuz berdi:", error)
    alert(
      "Ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
    )
  }
})

// Sana bo'yicha filterlash
let currentDateFilter = "all"
let customDateRange = {
  start: null,
  end: null,
}

// Kalendarni ochish/yopish
function toggleDatePicker(e) {
  if (e) {
    e.stopPropagation() // Eventni to'xtatish
  }
  const datePicker = document.getElementById("datePicker")
  datePicker.classList.toggle("hidden")

  // Animatsiya uchun
  if (!datePicker.classList.contains("hidden")) {
    datePicker.style.transform = "scale(0.95)"
    setTimeout(() => {
      datePicker.style.transform = "scale(1)"
    }, 10)
  }
}

// Kalendardan tashqariga bosilganda yopish
document.addEventListener("click", (e) => {
  const datePicker = document.getElementById("datePicker")
  const dateFilterBtn = document.querySelector(".date-filter-btn")

  if (!datePicker.contains(e.target) && !dateFilterBtn.contains(e.target)) {
    datePicker.classList.add("hidden")
  }
})

// Maxsus vaqt tanlash
function filterByDate(filterType, e) {
  if (e) {
    e.stopPropagation() // Eventni to'xtatish
  }

  currentDateFilter = filterType

  // Active klassini almashtirish
  document.querySelectorAll(".date-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-blue-600", "text-white")
    btn.classList.add("bg-blue-100", "text-blue-600")
  })

  // Tanlangan tugmani belgilash
  const selectedBtn = document.querySelector(
    `.date-filter-btn[onclick="filterByDate('${filterType}')"]`
  )
  if (selectedBtn) {
    selectedBtn.classList.remove("bg-blue-100", "text-blue-600")
    selectedBtn.classList.add("bg-blue-600", "text-white")
  }

  // Maxsus vaqt tanlash
  const customDateRange = document.getElementById("customDateRange")
  if (filterType === "custom") {
    customDateRange.classList.remove("hidden")
    // Animatsiya
    customDateRange.style.opacity = "0"
    customDateRange.style.transform = "translateY(-10px)"
    setTimeout(() => {
      customDateRange.style.opacity = "1"
      customDateRange.style.transform = "translateY(0)"
    }, 10)
  } else {
    customDateRange.classList.add("hidden")
  }

  // Qarzlarni filterlab ko'rsatish
  qarzlarniKorsatish(
    searchInput.value,
    document.querySelector(".filter-btn.active").dataset.filter
  )
}

// Maxsus vaqtni qo'llash
function applyCustomDateFilter(e) {
  if (e) {
    e.stopPropagation() // Eventni to'xtatish
  }

  const startDate = document.getElementById("startDate").value
  const endDate = document.getElementById("endDate").value

  if (!startDate || !endDate) {
    alert("Iltimos, boshlang'ich va tugash sanalarini tanlang!")
    return
  }

  customDateRange.start = new Date(startDate)
  customDateRange.end = new Date(endDate)
  customDateRange.end.setHours(23, 59, 59, 999) // Kun oxirigacha

  // Qarzlarni filterlab ko'rsatish
  qarzlarniKorsatish(
    searchInput.value,
    document.querySelector(".filter-btn.active").dataset.filter
  )

  // Kalendarni yopish
  const datePicker = document.getElementById("datePicker")
  datePicker.classList.add("hidden")
}

// Qarzlar ro'yxatini ko'rsatish
async function qarzlarniKorsatish(searchTerm = "", filterType = "all") {
  try {
    const snapshot = await db
      .collection("debts")
      .orderBy("createdAt", "desc")
      .get()
    qarzlar = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    qarzlarRoyxati.innerHTML = ""

    const filteredQarzlar = qarzlar.filter((qarz) => {
      // Qidiruv bo'yicha filtrlash
      const matchesSearch =
        qarz.mijozIsmi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qarz.telefon.includes(searchTerm) ||
        qarz.mahsulot.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter turi bo'yicha filtrlash
      const bugun = new Date()
      const tolashMuddati = new Date(qarz.tolashMuddati)
      const muddatiOtgan =
        bugun > tolashMuddati && qarz.status === "To'lanmagan"

      let matchesFilter = true
      switch (filterType) {
        case "tolangan":
          matchesFilter = qarz.status === "To'langan"
          break
        case "tolanmagan":
          matchesFilter = qarz.status === "To'lanmagan" && !muddatiOtgan
          break
        case "muddatiOtgan":
          matchesFilter = muddatiOtgan
          break
      }

      // Sana bo'yicha filtrlash
      const qarzSana = new Date(qarz.sana)
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      let matchesDate = true
      switch (currentDateFilter) {
        case "today":
          const todayStart = new Date(currentDate)
          const tomorrowStart = new Date(todayStart)
          tomorrowStart.setDate(todayStart.getDate() + 1)
          matchesDate = qarzSana >= todayStart && qarzSana < tomorrowStart
          break
        case "week":
          const weekStart = new Date(currentDate)
          weekStart.setDate(currentDate.getDate() - currentDate.getDay())
          const nextWeekStart = new Date(weekStart)
          nextWeekStart.setDate(weekStart.getDate() + 7)
          matchesDate = qarzSana >= weekStart && qarzSana < nextWeekStart
          break
        case "month":
          const monthStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          )
          const nextMonthStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
          )
          matchesDate = qarzSana >= monthStart && qarzSana < nextMonthStart
          break
        case "custom":
          if (customDateRange.start && customDateRange.end) {
            matchesDate =
              qarzSana >= customDateRange.start &&
              qarzSana <= customDateRange.end
          }
          break
      }

      return matchesSearch && matchesFilter && matchesDate
    })

    filteredQarzlar.forEach((qarz) => {
      const tr = document.createElement("tr")

      // Qarz muddati o'tganmi tekshirish
      const bugun = new Date()
      const tolashMuddati = new Date(qarz.tolashMuddati)
      const muddatiOtgan =
        bugun > tolashMuddati && qarz.status === "To'lanmagan"

      // Qolgan kunlarni hisoblash
      const qolganKunlar = Math.ceil(
        (tolashMuddati - bugun) / (1000 * 60 * 60 * 24)
      )
      const qolganKunlarText =
        qarz.status === "To'langan"
          ? '<span class="text-green-600">To\'langan</span>'
          : muddatiOtgan
          ? `<span class="text-red-600 font-bold">${Math.abs(
              qolganKunlar
            )} kun o'tgan</span>`
          : qolganKunlar === 0
          ? '<span class="text-yellow-600">Bugun</span>'
          : qolganKunlar < 0
          ? `<span class="text-red-600 font-bold">${Math.abs(
              qolganKunlar
            )} kun o'tgan</span>`
          : `<span class="text-blue-600">${qolganKunlar} kun qoldi</span>`

      // Status badge
      const statusBadge =
        qarz.status === "To'langan"
          ? '<span class="px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full">To\'langan</span>'
          : muddatiOtgan
          ? '<span class="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">Muddati o\'tgan</span>'
          : '<span class="px-2 py-1 text-xs font-semibold text-yellow-600 bg-yellow-100 rounded-full">To\'lanmagan</span>'

      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <i class="fas fa-user text-gray-500"></i>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${
                qarz.mijozIsmi
              }</div>
              ${statusBadge}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">
            <i class="fas fa-phone text-gray-400 mr-2"></i>${qarz.telefon}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">
            <i class="fas fa-tshirt text-gray-400 mr-2"></i>${qarz.mahsulot}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">
            <i class="fas fa-money-bill-alt text-gray-400 mr-2"></i>${qarz.qarzMiqdori.toLocaleString(
              "en-US"
            )} so'm
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">
            <i class="fas fa-calendar text-gray-400 mr-2"></i>${new Date(
              qarz.sana
            ).toLocaleDateString()}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm ${
            muddatiOtgan ? "text-red-600 font-bold" : "text-gray-900"
          }">
            <i class="fas fa-clock text-gray-400 mr-2"></i>${new Date(
              qarz.tolashMuddati
            ).toLocaleDateString()}
            <div class="mt-1 text-xs font-medium">
              ${qolganKunlarText}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button onclick="qarzniTahrirlash('${qarz.id}')" 
            class="text-white bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded-md">
            <i class="fas fa-edit mr-1"></i>Tahrirlash
          </button>
          <button onclick="qarzniTolash('${qarz.id}')" 
            class="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md">
            <i class="fas fa-check mr-1"></i>To'landi
          </button>
          <button onclick="qarzniOchirish('${qarz.id}')" 
            class="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md">
            <i class="fas fa-trash mr-1"></i>O'chirish
          </button>
        </td>
      `

      qarzlarRoyxati.appendChild(tr)
    })

    // Agar hech qanday qarz topilmasa
    if (filteredQarzlar.length === 0) {
      const emptyMessage = document.createElement("tr")
      emptyMessage.innerHTML = `
        <td colspan="7" class="px-6 py-4 text-center text-gray-500">
          <i class="fas fa-search text-4xl mb-2"></i>
          <p>Hech qanday qarz topilmadi</p>
        </td>
      `
      qarzlarRoyxati.appendChild(emptyMessage)
    }
  } catch (error) {
    console.error("Xatolik yuz berdi:", error)
  }
}

// Qarzni to'langan deb belgilash
async function qarzniTolash(id) {
  try {
    await db.collection("debts").doc(id).update({
      status: "To'langan",
    })

    await qarzlarniKorsatish()
    updateStats()

    // Telegram xabari
    const doc = await db.collection("debts").doc(id).get()
    const qarz = doc.data()
    const message = `✅ <b>Qarz to'landi</b>\n\n👤 Mijoz: ${
      qarz.mijozIsmi
    }\n📞 Telefon: ${qarz.telefon}\n👕 Mahsulot: ${
      qarz.mahsulot
    }\n💰 Qarz miqdori: ${qarz.qarzMiqdori.toLocaleString(
      "en-US"
    )} so'm\n📅 Sana: ${new Date(
      qarz.sana
    ).toLocaleDateString()}\n⏰ To'lash muddati: ${new Date(
      qarz.tolashMuddati
    ).toLocaleDateString()}`
    sendTelegramMessage(message)
  } catch (error) {
    console.error("Xatolik yuz berdi:", error)
    alert("Qarzni to'langan deb belgilashda xatolik yuz berdi.")
  }
}

// Qarzni o'chirish
async function qarzniOchirish(id) {
  if (confirm("Bu qarzni o'chirishni xohlaysizmi?")) {
    try {
      const doc = await db.collection("debts").doc(id).get()
      const qarz = doc.data()

      await db.collection("debts").doc(id).delete()
      await qarzlarniKorsatish()
      updateStats()

      // Telegram xabari
      const message = `❌ <b>Qarz o'chirildi</b>\n\n👤 Mijoz: ${
        qarz.mijozIsmi
      }\n📞 Telefon: ${qarz.telefon}\n👕 Mahsulot: ${
        qarz.mahsulot
      }\n💰 Qarz miqdori: ${qarz.qarzMiqdori.toLocaleString(
        "en-US"
      )} so'm\n📅 Sana: ${new Date(
        qarz.sana
      ).toLocaleDateString()}\n⏰ To'lash muddati: ${new Date(
        qarz.tolashMuddati
      ).toLocaleDateString()}`
      sendTelegramMessage(message)
    } catch (error) {
      console.error("Xatolik yuz berdi:", error)
      alert("Qarzni o'chirishda xatolik yuz berdi.")
    }
  }
}

// Qidiruv funksionalligini qo'shish
searchInput.addEventListener("input", (e) => {
  qarzlarniKorsatish(e.target.value)
})

// Filter funksiyasi
function filterQarzlar(filterType) {
  // Active klassini almashtirish
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active")
  })
  document
    .querySelector(`.filter-btn[data-filter="${filterType}"]`)
    .classList.add("active")

  // Qarzlarni filterlab ko'rsatish
  qarzlarniKorsatish(searchInput.value, filterType)
}

// Har kuni soat 7:10 da Excel faylini yuborish
function scheduleDailyExcelReport() {
  // Keyingi 7:10 ni hisoblash
  function getNextReportTime() {
    const now = new Date()
    const reportTime = new Date(now)
    reportTime.setHours(7, 10, 0, 0) // 7:10 AM

    // Agar hozirgi vaqt 7:10 dan keyin bo'lsa, keyingi kunga o'tkazish
    if (now > reportTime) {
      reportTime.setDate(reportTime.getDate() + 1)
    }

    return reportTime
  }

  // Keyingi yuborish vaqtigacha qolgan vaqtni hisoblash
  function getTimeUntilNextReport() {
    const nextReport = getNextReportTime()
    const now = new Date()
    return nextReport - now
  }

  // Avtomatik yuborishni boshlash
  function startAutoReport() {
    const timeUntilNext = getTimeUntilNextReport()

    // Keyingi yuborish vaqtigacha kutish
    setTimeout(() => {
      // Excel faylini yuborish
      exportToExcel()

      // Keyingi yuborishni rejalashtirish
      startAutoReport()
    }, timeUntilNext)
  }

  // Avtomatik yuborishni boshlash
  startAutoReport()
}

// Sahifa yuklanganda avtomatik yuborishni boshlash
document.addEventListener("DOMContentLoaded", async () => {
  await qarzlarniKorsatish("", "all")
  updateStats()
  restoreFormData()
  handleProductSelection()

  // Avtomatik yuborishni boshlash
  scheduleDailyExcelReport()
})

// Excelga export qilish
async function exportToExcel() {
  try {
    // Qarzlar ma'lumotlarini olish
    const qarzlar = await getDebts()
    const bugun = new Date()

    // Excel uchun ma'lumotlarni tayyorlash
    const excelData = qarzlar.map((qarz) => {
      const tolashMuddati = new Date(qarz.tolashMuddati)
      const qolganKunlarMs = tolashMuddati - bugun
      const qolganKunlar = Math.ceil(qolganKunlarMs / (1000 * 60 * 60 * 24))

      let qolganKunlarText = ""
      if (qarz.status === "To'langan") {
        qolganKunlarText = "To'langan"
      } else if (qolganKunlarMs < 0) {
        qolganKunlarText = `${Math.abs(qolganKunlar)} kun o'tgan`
      } else if (qolganKunlar === 0) {
        qolganKunlarText = "Bugun"
      } else {
        qolganKunlarText = `${qolganKunlar} kun qoldi`
      }

      // Timestamp bo'lsa, Date obyektiga o'tkazish
      const sana =
        qarz.sana && qarz.sana.toDate ? qarz.sana.toDate() : new Date(qarz.sana)
      const tolashMuddatiDate =
        qarz.tolashMuddati && qarz.tolashMuddati.toDate
          ? qarz.tolashMuddati.toDate()
          : new Date(qarz.tolashMuddati)

      return {
        "Mijoz ismi": qarz.mijozIsmi,
        Telefon: qarz.telefon,
        Mahsulot: qarz.mahsulot,
        "Qarz miqdori": qarz.qarzMiqdori,
        Sana: sana.toLocaleDateString(),
        "To'lash muddati": tolashMuddatiDate.toLocaleDateString(),
        Holati: qarz.status,
        "Qolgan kunlar": qolganKunlarText,
      }
    })

    // Worksheet yaratish
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Workbook yaratish
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Qarzlar")

    // Excel faylini base64 formatiga o'tkazish
    const excelBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" })

    // Joriy sana va vaqtni olish
    const now = new Date()
    const dateStr = now.toLocaleDateString("uz-UZ").replace(/\./g, "-")
    const timeStr = now.toLocaleTimeString("uz-UZ").replace(/:/g, "-")
    const fileName = `Qarzlar_${dateStr}_${timeStr}.xlsx`

    // Telegramga xabar yuborish
    const message = `📊 <b>Qarzlar ro'yxati</b>\n\nExcel fayl yuborilmoqda...`
    await sendTelegramMessage(message)

    // Excel faylini Telegram orqali yuborish
    const formData = new FormData()
    formData.append("chat_id", TELEGRAM_CHAT_ID)
    formData.append(
      "document",
      new Blob([Uint8Array.from(atob(excelBase64), (c) => c.charCodeAt(0))], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      fileName
    )

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error("Excel fayl yuborishda xatolik yuz berdi")
    }

    // Muvaffaqiyatli yuborilgan xabari
    await sendTelegramMessage("✅ Excel fayl muvaffaqiyatli yuborildi!")
  } catch (error) {
    console.error("Xatolik yuz berdi:", error)
    await sendTelegramMessage("❌ Excel fayl yuborishda xatolik yuz berdi!")
  }
}

// Firebase konfiguratsiyasi
const firebaseConfig = {
  apiKey: "AIzaSyCdxIPu4uW8olRftrBTbP6S9ZX0g9Pkq7I",
  authDomain: "qarz-daftar-b6430.firebaseapp.com",
  projectId: "qarz-daftar-b6430",
  storageBucket: "qarz-daftar-b6430.firebasestorage.app",
  messagingSenderId: "770124951619",
  appId: "1:770124951619:web:797b50a3de864564da24f6",
  measurementId: "G-94QXFQ24PJ",
}

// Firebase-ni ishga tushirish
firebase.initializeApp(firebaseConfig)
const db = firebase.firestore()

// Offline persistence-ni yoqish
db.enablePersistence().catch((err) => {
  if (err.code === "failed-precondition") {
    console.log("Offline persistence faqat bitta tabda ishlaydi")
  } else if (err.code === "unimplemented") {
    console.log("Brauzer offline persistence-ni qo'llab-quvvatlamaydi")
  }
})

// Qarz qo'shish funksiyasi
async function addDebt(debt) {
  try {
    await db.collection("debts").add({
      ...debt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    })
    // Telegram xabari
    const message = `✅ <b>Yangi qarz qo'shildi</b>\n\n👤 Mijoz: ${
      debt.mijozIsmi
    }\n📞 Telefon: ${debt.telefon}\n👕 Mahsulot: ${
      debt.mahsulot
    }\n💰 Qarz miqdori: ${debt.qarzMiqdori.toFixed(3)} so'm\n📅 Sana: ${
      debt.sana
    }\n⏰ To'lash muddati: ${debt.tolashMuddati}`
    sendTelegramMessage(message)
  } catch (error) {
    console.error("Qarz qo'shishda xatolik:", error)
    alert("Qarz qo'shishda xatolik yuz berdi.")
  }
}

// Qarzlarni olish funksiyasi
async function getDebts() {
  try {
    const snapshot = await db
      .collection("debts")
      .orderBy("createdAt", "desc")
      .get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Xatolik yuz berdi: ", error)
    return []
  }
}

// Qarzni o'chirish funksiyasi
async function deleteDebt(id) {
  try {
    await db.collection("debts").doc(id).delete()
  } catch (error) {
    console.error("Xatolik yuz berdi: ", error)
  }
}

// Qarzni yangilash funksiyasi
async function updateDebt(id, newData) {
  try {
    await db.collection("debts").doc(id).update(newData)
  } catch (error) {
    console.error("Xatolik yuz berdi: ", error)
  }
}
