-- ============================================================
-- بذرة مكتبة التمارين — 30 تمرينًا أساسيًا
-- ============================================================
-- ⚠️ عن الوسائط (فيديو/صور): لا يوجد أي media_url هنا، وهذا مقصود.
-- التطبيق يعرض الوسيط فقط حين يكون معه ترخيص معروف، ولا نستطيع وضع
-- وسائط لا نملك حقوقها. الأسماء والعضلات المستهدفة ومبادئ الأداء
-- معرفة تشريحية عامة موصوفة في مراجع منشورة، وليست نصًا منقولًا.
--
-- المرجع للعضلات المستهدفة والأداء الأساسي:
--   NSCA, Essentials of Strength Training and Conditioning, 4th ed.
--   ACSM's Guidelines for Exercise Testing and Prescription, 11th ed.
--
-- لإضافة وسائط لاحقًا راجع docs/EXERCISE_MEDIA.md.
--
-- on conflict (slug) do update: إعادة التشغيل تُحدِّث الوصف بدل أن
-- تفشل أو تُنشئ تكرارًا — والمعرّف uuid يبقى ثابتًا فلا تنكسر أي
-- مجموعة مسجَّلة تشير إليه.

insert into public.exercises
  (slug, name_ar, name_en, primary_muscle, secondary_muscles, equipment, metric, instructions_ar, instructions_en, cues_ar)
values
  ('barbell-back-squat', 'السكوات بالبار', 'Barbell Back Squat', 'quads', '{glutes,hamstrings,core}', 'barbell', 'weight_reps',
   '{"ضع البار على أعلى الظهر لا على الرقبة.","باعد قدميك بعرض الكتفين مع توجيه أصابع القدم للخارج قليلًا.","انزل بدفع الوركين للخلف حتى يوازي الفخذ الأرض أو أقل.","ادفع من منتصف القدم للعودة."}',
   '{"Rest the bar on your upper back, not your neck.","Feet shoulder-width, toes slightly out.","Descend by pushing hips back until thighs are at least parallel.","Drive up through midfoot."}',
   '{"الركبة تتبع اتجاه أصابع القدم","الظهر محايد طوال الحركة"}'),

  ('barbell-deadlift', 'الرفعة الميتة', 'Barbell Deadlift', 'hamstrings', '{glutes,back,forearms,core}', 'barbell', 'weight_reps',
   '{"قف والبار فوق منتصف القدم.","انحنِ من الورك وامسك البار خارج الساقين.","اشدّ الظهر وارفع البار ملاصقًا للساق.","اقفل الوركين في الأعلى دون إمالة الظهر للخلف."}',
   '{"Stand with the bar over midfoot.","Hinge at the hips and grip just outside your legs.","Brace, then lift keeping the bar against your legs.","Lock out at the hips without leaning back."}',
   '{"الظهر مستقيم لا مقوّس","البار قريب من الجسم طوال الحركة"}'),

  ('barbell-bench-press', 'ضغط البار المسطح', 'Barbell Bench Press', 'chest', '{triceps,shoulders}', 'barbell', 'weight_reps',
   '{"استلقِ مع لمس الرأس والكتفين والوركين للمقعد.","امسك البار أوسع قليلًا من الكتفين.","أنزل البار إلى منتصف الصدر بتحكّم.","ادفع حتى امتداد الذراعين."}',
   '{"Lie with head, shoulders and hips on the bench.","Grip slightly wider than shoulders.","Lower to mid-chest under control.","Press to full extension."}',
   '{"لوحا الكتف مشدودان للخلف","القدمان ثابتتان على الأرض"}'),

  ('pull-up', 'العقلة', 'Pull-Up', 'back', '{biceps,forearms}', 'bodyweight', 'reps_only',
   '{"امسك البار بقبضة أوسع من الكتفين.","ابدأ من تعليق كامل.","اسحب حتى يتجاوز الذقن البار.","انزل بتحكّم إلى التعليق الكامل."}',
   '{"Grip the bar wider than shoulders.","Start from a full hang.","Pull until your chin clears the bar.","Lower under control to a full hang."}',
   '{"ابدأ بخفض لوحي الكتف","تجنّب التأرجح"}'),

  ('push-up', 'الضغط', 'Push-Up', 'chest', '{triceps,shoulders,core}', 'bodyweight', 'reps_only',
   '{"ضع اليدين أوسع قليلًا من الكتفين.","حافظ على خط مستقيم من الرأس إلى الكعب.","انزل حتى يقترب الصدر من الأرض.","ادفع للأعلى دون ترك الورك يهبط."}',
   '{"Hands slightly wider than shoulders.","Keep a straight line from head to heels.","Lower until your chest is near the floor.","Press up without letting the hips sag."}',
   '{"شدّ البطن والألية","المرفقان بزاوية ٤٥ درجة لا ٩٠"}'),

  ('overhead-press', 'الضغط العلوي', 'Overhead Press', 'shoulders', '{triceps,core}', 'barbell', 'weight_reps',
   '{"البار على أعلى الصدر والقبضة بعرض الكتفين.","اشدّ البطن والألية.","ادفع البار للأعلى مع إمالة الرأس للخلف قليلًا.","اقفل الذراعين والبار فوق منتصف القدم."}',
   '{"Bar on the upper chest, hands shoulder-width.","Brace your abs and glutes.","Press overhead, moving your head back slightly.","Lock out with the bar over midfoot."}',
   '{"لا تقوّس أسفل الظهر","البار ينتهي فوق منتصف القدم"}'),

  ('dumbbell-row', 'التجديف بالدمبل', 'Dumbbell Row', 'back', '{biceps,forearms}', 'dumbbell', 'weight_reps',
   '{"ضع ركبة ويدًا على مقعد.","دع الدمبل يتدلى بذراع ممدودة.","اسحب نحو الورك مع تقريب لوح الكتف.","أنزل بتحكّم."}',
   '{"Place one knee and hand on a bench.","Let the dumbbell hang with the arm extended.","Row toward your hip, retracting the shoulder blade.","Lower under control."}',
   '{"لا تلوِ الجذع أثناء السحب"}'),

  ('romanian-deadlift', 'الرفعة الرومانية', 'Romanian Deadlift', 'hamstrings', '{glutes,back}', 'barbell', 'weight_reps',
   '{"قف والبار أمام الفخذين وركبتاك مثنيتان قليلًا.","ادفع الوركين للخلف وأنزل البار على الفخذين.","توقّف عند شعورك بشدّ خلف الفخذ.","عد بدفع الوركين للأمام."}',
   '{"Stand with the bar at your thighs, knees softly bent.","Push your hips back, lowering the bar along your thighs.","Stop when you feel a hamstring stretch.","Return by driving the hips forward."}',
   '{"الحركة من الورك لا من أسفل الظهر"}'),

  ('lat-pulldown', 'سحب الحبل للصدر', 'Lat Pulldown', 'back', '{biceps}', 'cable', 'weight_reps',
   '{"اجلس وثبّت الفخذين تحت الوسادة.","امسك البار أوسع من الكتفين.","اسحب إلى أعلى الصدر.","عد ببطء إلى الامتداد الكامل."}',
   '{"Sit and secure your thighs under the pad.","Grip wider than shoulders.","Pull to the upper chest.","Return slowly to full extension."}',
   '{"لا ترجع الجذع كثيرًا للخلف"}'),

  ('leg-press', 'ضغط الأرجل', 'Leg Press', 'quads', '{glutes,hamstrings}', 'machine', 'weight_reps',
   '{"ضع القدمين بعرض الكتفين على المنصة.","أنزل الوزن حتى تصل الركبة لزاوية ٩٠ درجة.","ادفع دون قفل الركبتين بعنف."}',
   '{"Feet shoulder-width on the platform.","Lower until your knees reach about 90 degrees.","Press without slamming the knees into lockout."}',
   '{"لا ترفع أسفل الظهر عن المقعد"}'),

  ('dumbbell-bicep-curl', 'مرجحة الباي', 'Dumbbell Biceps Curl', 'biceps', '{forearms}', 'dumbbell', 'weight_reps',
   '{"قف والدمبلان بجانبيك.","ارفع مع تثبيت المرفقين بجانب الجذع.","أنزل بتحكّم كامل."}',
   '{"Stand with dumbbells at your sides.","Curl while keeping elbows pinned to your torso.","Lower under full control."}',
   '{"لا تؤرجح الجذع"}'),

  ('triceps-pushdown', 'دفع الترايسبس', 'Triceps Pushdown', 'triceps', '{}', 'cable', 'weight_reps',
   '{"امسك البار بقبضة علوية.","ثبّت المرفقين بجانبك.","مدّ الذراعين كاملًا ثم عد ببطء."}',
   '{"Grip the bar overhand.","Keep elbows at your sides.","Extend fully, then return slowly."}',
   '{"الحركة من المرفق فقط"}'),

  ('plank', 'البلانك', 'Plank', 'core', '{shoulders,glutes}', 'bodyweight', 'duration',
   '{"استند على الساعدين وأصابع القدم.","حافظ على خط مستقيم من الرأس للكعب.","شدّ البطن والألية طوال الوقت."}',
   '{"Support yourself on forearms and toes.","Keep a straight line from head to heels.","Brace abs and glutes throughout."}',
   '{"لا ترفع الورك ولا تدعه يهبط"}'),

  ('hanging-leg-raise', 'رفع الأرجل معلقًا', 'Hanging Leg Raise', 'core', '{forearms}', 'bodyweight', 'reps_only',
   '{"تعلّق من البار بذراعين ممدودتين.","ارفع الساقين حتى زاوية ٩٠ درجة أو أعلى.","أنزل ببطء دون تأرجح."}',
   '{"Hang from the bar with arms extended.","Raise your legs to 90 degrees or higher.","Lower slowly without swinging."}',
   '{"ابدأ الحركة من الحوض لا من الورك وحده"}'),

  ('walking-lunge', 'الطعن المشي', 'Walking Lunge', 'quads', '{glutes,hamstrings,core}', 'bodyweight', 'reps_only',
   '{"اخطُ خطوة واسعة للأمام.","أنزل حتى تقترب الركبة الخلفية من الأرض.","ادفع من كعب القدم الأمامية وبدّل."}',
   '{"Step forward into a long stride.","Lower until the back knee nearly touches the floor.","Drive through the front heel and switch."}',
   '{"الجذع منتصب"}'),

  ('hip-thrust', 'دفع الورك', 'Barbell Hip Thrust', 'glutes', '{hamstrings,core}', 'barbell', 'weight_reps',
   '{"استند بأعلى الظهر على مقعد والبار فوق الورك.","ادفع الوركين للأعلى حتى يستقيم الجسم.","اضغط الألية في الأعلى ثم أنزل بتحكّم."}',
   '{"Rest your upper back on a bench with the bar over your hips.","Drive your hips up until your body is straight.","Squeeze the glutes at the top, then lower under control."}',
   '{"اثنِ الذقن قليلًا وانظر للأمام"}'),

  ('lateral-raise', 'الرفرفة الجانبية', 'Lateral Raise', 'shoulders', '{}', 'dumbbell', 'weight_reps',
   '{"قف والدمبلان بجانبيك.","ارفع الذراعين جانبًا حتى مستوى الكتف.","أنزل ببطء."}',
   '{"Stand with dumbbells at your sides.","Raise your arms out to shoulder height.","Lower slowly."}',
   '{"لا ترفع فوق مستوى الكتف","لا تستخدم الزخم"}'),

  ('calf-raise', 'رفع السمانة', 'Standing Calf Raise', 'calves', '{}', 'machine', 'weight_reps',
   '{"قف بمشط القدم على الحافة.","ارفع الكعب لأقصى مدى.","أنزل حتى الشدّ الكامل."}',
   '{"Stand with the balls of your feet on the edge.","Rise onto your toes as high as possible.","Lower into a full stretch."}',
   '{"مدى حركة كامل أفضل من وزن أثقل"}'),

  ('face-pull', 'سحب الوجه', 'Face Pull', 'shoulders', '{back}', 'cable', 'weight_reps',
   '{"اضبط الحبل عند مستوى الوجه.","اسحب نحو الجبهة مع إبعاد اليدين.","اعصر لوحي الكتف ثم عد."}',
   '{"Set the rope at face height.","Pull toward your forehead, spreading your hands.","Squeeze the shoulder blades, then return."}',
   '{"ممتاز لصحة الكتف وموازنة تمارين الدفع"}'),

  ('running', 'الجري', 'Running', 'cardio', '{quads,hamstrings,calves}', 'bodyweight', 'distance_duration',
   '{"ابدأ بإحماء خفيف ٥ دقائق.","حافظ على إيقاع تنفس منتظم.","ابرد تدريجيًا في النهاية."}',
   '{"Start with a 5-minute easy warm-up.","Keep a steady breathing rhythm.","Cool down gradually."}',
   '{"زد المسافة الأسبوعية تدريجيًا لتفادي الإصابة"}')
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  primary_muscle = excluded.primary_muscle,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  metric = excluded.metric,
  instructions_ar = excluded.instructions_ar,
  instructions_en = excluded.instructions_en,
  cues_ar = excluded.cues_ar;
