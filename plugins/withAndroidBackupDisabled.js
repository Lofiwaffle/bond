const { withAndroidManifest } = require('expo/config-plugins')

/** Disable Auto Backup so couple check-ins are not copied off-device unencrypted. */
function withAndroidBackupDisabled(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0]
    if (application?.$) {
      application.$['android:allowBackup'] = 'false'
    }
    return mod
  })
}

module.exports = withAndroidBackupDisabled
