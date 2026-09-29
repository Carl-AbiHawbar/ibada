// Starter policy copy. DRAFT: the owner should review it (and ideally have it checked) before launch.
export const POLICY_SLUGS = ['shipping', 'returns', 'privacy', 'terms'] as const;
export type PolicySlug = (typeof POLICY_SLUGS)[number];

type Section = { heading: string; paragraphs: string[] };
export type Policy = { title: string; updated: string; sections: Section[] };

const UPDATED = '2026-09-30';

export const POLICIES: Record<PolicySlug, Record<'en' | 'ar', Policy>> = {
  shipping: {
    en: {
      title: 'Shipping & delivery',
      updated: UPDATED,
      sections: [
        { heading: 'Where we deliver', paragraphs: ['We deliver to every area of Lebanon.'] },
        {
          heading: 'Delivery time',
          paragraphs: ['Orders are typically delivered within 2–4 business days after we confirm them with you by phone.'],
        },
        {
          heading: 'Delivery fee',
          paragraphs: [
            'A delivery fee applies and is shown clearly in your cart and at checkout before you place your order. Delivery is free when you claim our free-delivery offer: tap “Free delivery” and leave your name, email and phone.',
          ],
        },
        {
          heading: 'Order confirmation',
          paragraphs: ['After you order, our team calls the phone number you gave to confirm your details. Please keep your phone reachable so we can ship quickly.'],
        },
        {
          heading: 'Payment',
          paragraphs: ['All orders are cash on delivery. You pay the courier in US dollars when your order arrives. Having the exact amount ready helps.'],
        },
      ],
    },
    ar: {
      title: 'الشحن والتوصيل',
      updated: UPDATED,
      sections: [
        { heading: 'مناطق التوصيل', paragraphs: ['نوصل إلى جميع المناطق في لبنان.'] },
        { heading: 'مدة التوصيل', paragraphs: ['يتم توصيل الطلبات عادةً خلال 2–4 أيام عمل بعد تأكيدها معك هاتفيًا.'] },
        {
          heading: 'رسوم التوصيل',
          paragraphs: [
            'تُطبَّق رسوم توصيل تظهر بوضوح في سلتك وعند إتمام الطلب قبل تأكيده. ويصبح التوصيل مجانيًا عند الاستفادة من عرض التوصيل المجاني: اضغط على «توصيل مجاني» واترك اسمك وبريدك الإلكتروني ورقم هاتفك.',
          ],
        },
        {
          heading: 'تأكيد الطلب',
          paragraphs: ['بعد تسجيل طلبك، يتصل فريقنا بالرقم الذي أدخلته لتأكيد التفاصيل. يرجى إبقاء هاتفك متاحًا لنتمكن من الشحن بسرعة.'],
        },
        {
          heading: 'الدفع',
          paragraphs: ['جميع الطلبات تُدفع نقدًا عند الاستلام. تدفع للمندوب بالدولار الأميركي عند وصول طلبك، ويُفضّل تجهيز المبلغ المطلوب.'],
        },
      ],
    },
  },
  returns: {
    en: {
      title: '60-day money-back guarantee',
      updated: UPDATED,
      sections: [
        {
          heading: 'Our guarantee',
          paragraphs: ["If IBADA isn't right for you, contact us within 60 days of delivery and we'll refund the price of the product."],
        },
        {
          heading: 'How to return',
          paragraphs: ['Contact us by phone or WhatsApp with your order number. We will arrange the return with you.'],
        },
        { heading: 'Condition', paragraphs: ['Please return the devices, ideally in their original packaging.'] },
        { heading: 'Refunds', paragraphs: ['Once we receive the return, we refund you in cash or by another method agreed with our team.'] },
        {
          heading: 'Damaged or wrong items',
          paragraphs: ["If your order arrives damaged or isn't what you ordered, contact us within 48 hours and we'll replace it at no cost."],
        },
      ],
    },
    ar: {
      title: 'ضمان استرداد المال لمدة 60 يومًا',
      updated: UPDATED,
      sections: [
        {
          heading: 'ضماننا',
          paragraphs: ['إذا لم يناسبك IBADA، تواصل معنا خلال 60 يومًا من الاستلام وسنعيد لك ثمن المنتج.'],
        },
        { heading: 'طريقة الإرجاع', paragraphs: ['تواصل معنا هاتفيًا أو عبر واتساب مع رقم طلبك، وسنرتّب الإرجاع معك.'] },
        { heading: 'حالة المنتج', paragraphs: ['يرجى إرجاع الأجهزة، ويُفضّل أن تكون في عبوتها الأصلية.'] },
        { heading: 'استرداد المال', paragraphs: ['بعد استلام المرتجع، نعيد لك المبلغ نقدًا أو بطريقة أخرى يتم الاتفاق عليها مع فريقنا.'] },
        {
          heading: 'منتجات تالفة أو خاطئة',
          paragraphs: ['إذا وصل طلبك تالفًا أو مختلفًا عمّا طلبت، تواصل معنا خلال 48 ساعة وسنستبدله مجانًا.'],
        },
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy policy',
      updated: UPDATED,
      sections: [
        {
          heading: 'What we collect',
          paragraphs: [
            'When you order we collect your name, phone number, delivery address, any notes you add, and what you ordered. We never ask for card details.',
            'When you claim the free-delivery offer we collect your name, email address and phone number, and whether you agreed to receive offers by email.',
          ],
        },
        {
          heading: 'Why we collect it',
          paragraphs: [
            'To deliver your order, confirm it with you by phone, give support and honour our guarantee, and meet our legal obligations.',
            'Free-delivery details are used to apply free delivery to your orders. We send offers and news by email only if you ticked the box, and you can ask us to stop at any time.',
          ],
        },
        {
          heading: 'Cookies and analytics',
          paragraphs: [
            'We use a small first-party cookie (ibada_sid) that holds a random identifier so we can count visits, carts and checkouts. It contains no personal information and is not shared with advertisers.',
            'To protect the shop from fraud and abuse we keep only a scrambled (hashed) form of IP addresses, never the address itself.',
            'Our checkout uses Cloudflare Turnstile to block automated fake orders.',
          ],
        },
        {
          heading: 'Who we share it with',
          paragraphs: ['We share your name, phone and address only with the delivery company handling your order. We never sell your data.'],
        },
        {
          heading: 'How long we keep it',
          paragraphs: ['We keep order records for as long as needed for accounting, delivery and our guarantee. You can ask us to delete your data at any time, except where the law requires us to keep it.'],
        },
        { heading: 'Contact', paragraphs: ['For any privacy question, contact us through the details on our Contact page.'] },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      updated: UPDATED,
      sections: [
        {
          heading: 'ما الذي نجمعه',
          paragraphs: [
            'عند الطلب نجمع اسمك ورقم هاتفك وعنوان التوصيل وأي ملاحظات تضيفها وتفاصيل طلبك. لا نطلب أبدًا معلومات بطاقتك.',
            'عند الاستفادة من عرض التوصيل المجاني نجمع اسمك وبريدك الإلكتروني ورقم هاتفك، وما إذا كنت قد وافقت على تلقي العروض عبر البريد الإلكتروني.',
          ],
        },
        {
          heading: 'لماذا نجمعه',
          paragraphs: [
            'لتوصيل طلبك وتأكيده معك هاتفيًا وتقديم الدعم والالتزام بضماننا، وللوفاء بالتزاماتنا القانونية.',
            'نستخدم معلومات عرض التوصيل المجاني لتطبيق التوصيل المجاني على طلباتك. ولا نرسل العروض والأخبار عبر البريد الإلكتروني إلا إذا اخترت ذلك، ويمكنك أن تطلب منا التوقف في أي وقت.',
          ],
        },
        {
          heading: 'ملفات تعريف الارتباط والإحصاءات',
          paragraphs: [
            'نستخدم ملف تعريف ارتباط صغيرًا خاصًا بنا (ibada_sid) يحتوي على معرّف عشوائي لإحصاء الزيارات والسلال والطلبات. لا يحتوي على أي معلومات شخصية ولا نشاركه مع المعلنين.',
            'لحماية المتجر من الاحتيال وإساءة الاستخدام، نحتفظ فقط بصيغة مشفّرة (مُجزّأة) من عناوين IP وليس بالعنوان نفسه.',
            'تستخدم صفحة الطلب خدمة Cloudflare Turnstile لمنع الطلبات الوهمية الآلية.',
          ],
        },
        {
          heading: 'مع من نشاركه',
          paragraphs: ['نشارك اسمك ورقم هاتفك وعنوانك فقط مع شركة التوصيل التي تتولى طلبك. لا نبيع بياناتك أبدًا.'],
        },
        {
          heading: 'مدة الاحتفاظ',
          paragraphs: ['نحتفظ بسجلات الطلبات للمدة اللازمة للمحاسبة والتوصيل والضمان. يمكنك أن تطلب منا حذف بياناتك في أي وقت، إلا حيث يفرض القانون الاحتفاظ بها.'],
        },
        { heading: 'التواصل', paragraphs: ['لأي سؤال يتعلق بالخصوصية، تواصل معنا عبر المعلومات الموجودة في صفحة "تواصل معنا".'] },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of service',
      updated: UPDATED,
      sections: [
        { heading: 'About us', paragraphs: ['ibadashop.com is operated by IBADA in Lebanon.'] },
        {
          heading: 'Orders',
          paragraphs: ["Placing an order is an offer to buy. We confirm every order by phone and may cancel orders we can't confirm or that appear fraudulent."],
        },
        {
          heading: 'Prices',
          paragraphs: ['Prices are in US dollars. Prices and offers may change; the price shown when you place your order is the price you pay.'],
        },
        {
          heading: 'Using the product',
          paragraphs: ['IBADA devices are for indoor use on standard 220V sockets. Follow the instructions on the packaging. Results depend on your home and the pests present.'],
        },
        { heading: 'Guarantee', paragraphs: ['Your purchase is covered by our 60-day money-back guarantee, described on its own page.'] },
        {
          heading: 'Liability',
          paragraphs: ['To the extent permitted by law, our liability is limited to the price you paid for the product.'],
        },
        { heading: 'Changes', paragraphs: ['We may update these terms. The version in force when you order applies to that order.'] },
      ],
    },
    ar: {
      title: 'شروط الخدمة',
      updated: UPDATED,
      sections: [
        { heading: 'من نحن', paragraphs: ['يُدار موقع ibadashop.com من قبل IBADA في لبنان.'] },
        {
          heading: 'الطلبات',
          paragraphs: ['تسجيل الطلب هو عرض للشراء. نؤكد كل طلب هاتفيًا، ويحق لنا إلغاء الطلبات التي يتعذّر تأكيدها أو التي تبدو احتيالية.'],
        },
        {
          heading: 'الأسعار',
          paragraphs: ['الأسعار بالدولار الأميركي. قد تتغير الأسعار والعروض، والسعر الظاهر عند تسجيل طلبك هو السعر الذي تدفعه.'],
        },
        {
          heading: 'استخدام المنتج',
          paragraphs: ['أجهزة IBADA مخصّصة للاستخدام الداخلي على مقابس 220 فولت العادية. اتبع التعليمات المرفقة على العبوة. تختلف النتائج بحسب المنزل ونوع الآفات.'],
        },
        { heading: 'الضمان', paragraphs: ['مشترياتك مشمولة بضمان استرداد المال لمدة 60 يومًا، الموضّح في صفحته الخاصة.'] },
        {
          heading: 'المسؤولية',
          paragraphs: ['في الحدود التي يسمح بها القانون، تقتصر مسؤوليتنا على ثمن المنتج الذي دفعته.'],
        },
        { heading: 'التعديلات', paragraphs: ['قد نحدّث هذه الشروط، وتنطبق على كل طلب النسخة السارية عند تسجيله.'] },
      ],
    },
  },
};
