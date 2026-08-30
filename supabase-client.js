import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.SUPABASE_CONFIG;
const configured = config && /^https:\/\//.test(config.url || '') && !config.url.includes('YOUR-PROJECT') && config.publishableKey && !config.publishableKey.includes('YOUR-');

if (configured) {
  const supabase = createClient(config.url, config.publishableKey);
  window.supabase = supabase;
  window.supabaseReady = true;
  window.dispatchEvent(new Event('supabase-ready'));

  // Khách cũng có thể đọc danh sách tên (sau migration guest-read)
  try {
    const { data, error } = await supabase.from('student_directory')
      .select('id, full_name, class_role')
      .eq('active', true)
      .order('full_name');
    if (!error && data?.length) {
      window.DANH_SACH_HOC_SINH = data.map((student, index) => ({
        stt: index + 1,
        hoTen: student.full_name,
        vaiTro: student.class_role || ''
      }));
      window.dispatchEvent(new Event('student-directory-loaded'));
    }
  } catch (_) {
    // Giữ dữ liệu tĩnh trong du-lieu-hoc-sinh.js
  }
}
