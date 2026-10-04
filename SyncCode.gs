/**
 * โยธาแคด — ตัวซิงก์ข้อมูลผ่าน Google Drive ของคุณเอง
 * 1) แก้ SECRET ด้านล่างเป็นรหัสของคุณ (ห้ามขึ้นต้นด้วย CHANGE-ME)
 * 2) Deploy → New deployment → Web app
 *    Execute as: Me  |  Who has access: Anyone
 * 3) คัดลอก Web app URL (ลงท้าย /exec) ไปวางในหน้า "ซิงก์" ของแอป
 */
var SECRET = 'CHANGE-ME-ตั้งรหัสของคุณเอง';
var FOLDER = 'โยธาแคด Sync';
var FILE = 'yothacad-data.json';
var KEEP = 20;

function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' }); }
  return handle_(p);
}

function handle_(p) {
  if (SECRET.indexOf('CHANGE-ME') === 0) return out_({ ok: false, error: 'ยังไม่ได้ตั้งรหัส SECRET ใน Apps Script' });
  if (p.secret !== SECRET) return out_({ ok: false, error: 'รหัสซิงก์ไม่ถูกต้อง' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var folder = folder_();
    var file = find_(folder, FILE);
    if (p.action === 'ping') {
      return out_({ ok: true, time: new Date().toISOString(), info: file ? { updated: file.getLastUpdated().toISOString(), size: file.getSize() } : null });
    }
    if (p.action === 'pull') {
      if (!file) return out_({ ok: true, data: null });
      return out_({ ok: true, data: JSON.parse(file.getBlob().getDataAsString('UTF-8')), updated: file.getLastUpdated().toISOString() });
    }
    if (p.action === 'push') {
      if (!p.data || p.data.app !== 'yothacad') return out_({ ok: false, error: 'ไม่ใช่ข้อมูลของโยธาแคด' });
      var json = JSON.stringify(p.data);
      if (file) { backup_(folder, file); file.setContent(json); }
      else folder.createFile(FILE, json, 'application/json');
      return out_({ ok: true, time: new Date().toISOString() });
    }
    return out_({ ok: false, error: 'ไม่รู้จักคำสั่ง ' + p.action });
  } finally {
    lock.releaseLock();
  }
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
function find_(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function backup_(folder, file) {
  var it = folder.getFoldersByName('backups');
  var bk = it.hasNext() ? it.next() : folder.createFolder('backups');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd_HH-mm-ss');
  file.makeCopy('yothacad-' + stamp + '.json', bk);
  var files = [], f = bk.getFiles();
  while (f.hasNext()) files.push(f.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = KEEP; i < files.length; i++) files[i].setTrashed(true);
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
