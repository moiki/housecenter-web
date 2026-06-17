// Froala plugins + base styles. Imported once here; RichTextEditor and RichTextView
// both pull this module, so the assets load wherever rich text renders. (The editor
// core itself is imported by react-froala-wysiwyg; this only adds the plugin bundle.)
import 'froala-editor/js/plugins.pkgd.min.js'
import 'froala-editor/css/froala_editor.pkgd.min.css'
import 'froala-editor/css/froala_style.min.css'

// Compact toolbar — the only profile we use: treatment description/details, patient &
// treatment comments, and consultation messages. Plugins are limited to what these
// fields actually need; the legacy config loaded imageManager/embedly/emoticons (heavy,
// unused). To drop the "Powered by Froala" mark, add a licensed `key` here.
export const froalaCompactConfig = {
  heightMin: 150,
  heightMax: 300,
  toolbarButtons: {
    moreText: {
      buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'fontSize', 'textColor', 'clearFormatting'],
      buttonsVisible: 4,
    },
    moreParagraph: {
      buttons: ['alignLeft', 'alignCenter', 'alignRight', 'formatUL', 'formatOL', 'indent', 'outdent'],
      buttonsVisible: 3,
    },
    moreRich: {
      buttons: ['insertLink'],
      buttonsVisible: 1,
    },
  },
  pluginsEnabled: ['align', 'colors', 'fontSize', 'link', 'lists', 'paragraphFormat', 'wordPaste'],
  imageUpload: false,
  quickInsertEnabled: false,
}
