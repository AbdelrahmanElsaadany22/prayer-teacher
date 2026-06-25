# Friends Comparison API

Endpoint بيرجّع مقارنة بين اليوزر اللي فاتح (`viewer`) وكل أصدقائه، من حيث إحصائيات الصلاة.
الفكرة إن الباك بيرجّع **كل المقاييس جاهزة**، والفرونت هو اللي يعمل الفلترة/الترتيب على المقياس اللي اليوزر يختاره (الدقة، عدد الصلوات، المدة، الأخطاء... إلخ).

---

## Endpoint

```
GET /user/comparison
```

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | مطلوب — JWT في الهيدر: `Authorization: Bearer <token>` |
| **Params** | لا يوجد (بياخد اليوزر من الـ token) |

---

## Response

`200 OK` — Array من الـ objects. **أول عنصر دايمًا هو اليوزر نفسه** (`isSelf: true`)، وبعده الأصدقاء.
لو اليوزر ملوش أصدقاء، هيرجع array فيه عنصر واحد بس (هو نفسه).

### شكل كل عنصر

```jsonc
[
  {
    "userId": "665f1a2b3c4d5e6f7a8b9c0d",
    "name": "Abdelrahman",
    "isSelf": true,                 // ده اليوزر اللي فاتح
    "totalPrayers": 42,             // إجمالي عدد جلسات الصلاة
    "avgAccuracy": 87.5,            // متوسط الجودة % (منزّل لرقم عشري واحد)
    "avgDurationSec": 305,          // متوسط مدة الصلاة بالثواني (عدد صحيح)
    "totalMistakes": 18,            // إجمالي الأخطاء عبر كل الجلسات
    "avgMistakes": 0.4,             // متوسط الأخطاء لكل صلاة
    "mostMistakenPrayer": "Asr",   // أكتر صلاة بيغلط فيها (أعلى totalMistakes) — أو null لو مفيش جلسات
    "perPrayer": [                  // تفصيل لكل صلاة اليوزر صلّاها
      {
        "prayerName": "Fajr",
        "count": 10,               // عدد المرات
        "avgAccuracy": 90.2,       // متوسط الجودة % للصلاة دي
        "totalMistakes": 3         // إجمالي الأخطاء في الصلاة دي
      },
      {
        "prayerName": "Asr",
        "count": 8,
        "avgAccuracy": 80.0,
        "totalMistakes": 9
      }
      // ... باقي الصلوات اللي اتصلّت
    ]
  },
  {
    "userId": "665f1a2b3c4d5e6f7a8b9c11",
    "name": "Mohamed",
    "isSelf": false,
    "totalPrayers": 30,
    "avgAccuracy": 79.1,
    "avgDurationSec": 280,
    "totalMistakes": 25,
    "avgMistakes": 0.83,
    "mostMistakenPrayer": "Maghrib",
    "perPrayer": [ /* ... */ ]
  }
]
```

---

## شرح الحقول

| الحقل | النوع | المعنى |
|---|---|---|
| `userId` | `string` | الـ ObjectId بتاع اليوزر |
| `name` | `string` | اسم اليوزر |
| `isSelf` | `boolean` | `true` لو ده اليوزر اللي فاتح (مفيد عشان تميّزه في الـ UI) |
| `totalPrayers` | `number` | عدد جلسات الصلاة الكلي |
| `avgAccuracy` | `number` | متوسط الجودة % (0–100، رقم عشري واحد). **الأعلى أحسن** |
| `avgDurationSec` | `number` | متوسط المدة بالثواني. اقسمه على 60 لو عايز دقايق |
| `totalMistakes` | `number` | إجمالي الأخطاء. **الأقل أحسن** |
| `avgMistakes` | `number` | متوسط الأخطاء لكل صلاة (رقم عشري واحد) |
| `mostMistakenPrayer` | `string \| null` | اسم أكتر صلاة فيها أخطاء، أو `null` لو مفيش بيانات |
| `perPrayer` | `array` | تفصيل لكل صلاة اتصلّت (مش بيرجّع الصلوات اللي معملهاش اليوزر) |
| `perPrayer[].prayerName` | `string` | اسم الصلاة (`Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`) |
| `perPrayer[].count` | `number` | عدد مرات الصلاة دي |
| `perPrayer[].avgAccuracy` | `number` | متوسط جودتها % |
| `perPrayer[].totalMistakes` | `number` | إجمالي أخطائها — استخدمه للفلتر "مين بيغلط أكتر في صلاة معيّنة" |

---

## ملاحظات للفرونت

- **الترتيب/الفلترة على المقياس بتتعمل في الفرونت.** الباك بيرجّع كل حاجة، إنت بترتّب الـ array حسب المقياس اللي اليوزر اختاره (مثلًا `sort` تنازلي على `avgAccuracy`).
- **مدة الصلاة** بتترجع بالثواني (`avgDurationSec`)؛ في الـ DB متخزّنة كنص `mm:ss` أو `hh:mm:ss` والباك بيحوّلها ويحسب المتوسط.
- **فلتر "مين بيغلط أكتر في صلاة X":** خُد كل عنصر، دوّر في `perPrayer` على الصلاة اللي اليوزر اختارها، وقارن بالـ `totalMistakes` بتاعها. لو الصلاة مش موجودة في `perPrayer` بتاعة يوزر معيّن يبقى معملهاش = 0.
- **أسماء الصلوات** بتترجع بالإنجليزي زي ما هي متخزّنة (`Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`) — الترجمة للعربي بتتعمل عندك في الفرونت.
- اليوزر اللي ملوش جلسات بتبقى أرقامه أصفار و `perPrayer` فاضية و `mostMistakenPrayer = null`.

---

## أكواد الأخطاء المحتملة

| الكود | السبب |
|---|---|
| `401 Unauthorized` | مفيش token أو token غلط |
| `404 Not Found` | اليوزر مش موجود (الـ id غلط) |
