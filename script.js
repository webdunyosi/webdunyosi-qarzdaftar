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
  // Faqat raqamlarni qoldirish
  let value = input.value.replace(/\D/g, "")

  // Har 3 ta raqamdan keyin nuqta qo'yish
  value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  // Input qiymatini yangilash
  input.value = value
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
      qarzMiqdori: parseFloat(inputFields.qarzMiqdori.value),
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
      }\n💰 Qarz miqdori: ${yangiMalumot.qarzMiqdori.toFixed(
        3
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
      }\n💰 Qarz miqdori: ${yangiMalumot.qarzMiqdori.toFixed(
        3
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

      return matchesSearch && matchesFilter
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
            <i class="fas fa-money-bill-alt text-gray-400 mr-2"></i>${qarz.qarzMiqdori.toFixed(
              3
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
    }\n💰 Qarz miqdori: ${qarz.qarzMiqdori.toLocaleString()} so'm\n📅 Sana: ${new Date(
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
      }\n💰 Qarz miqdori: ${qarz.qarzMiqdori.toLocaleString()} so'm\n📅 Sana: ${new Date(
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

// Sahifa yuklanganda qarzlarni ko'rsatish va statistikani yangilash
document.addEventListener("DOMContentLoaded", async () => {
  await qarzlarniKorsatish("", "all") // Sahifa yuklanganda 'all' filterini qo'llash
  updateStats()
  restoreFormData()
  handleProductSelection()
})

// Excelga export qilish
async function exportToExcel() {
  // Qarzlar ma'lumotlarini olish
  const qarzlar = await getDebts() // LocalStorage o'rniga Firebase'dan olish
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

  // Excel faylini yuklab olish
  const fileName = `Qarzlar_${new Date().toLocaleDateString()}.xlsx`
  XLSX.writeFile(wb, fileName)
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
