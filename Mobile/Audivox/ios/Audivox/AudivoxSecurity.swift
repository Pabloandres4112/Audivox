import Foundation

@objc(AudivoxSecurity)
class AudivoxSecurity: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    [
      "LASTFM_API_KEY": ProcessInfo.processInfo.environment["AUDIVOX_LASTFM_API_KEY"] ?? "",
      "YOUTUBE_CONVERTER_ENDPOINT": ProcessInfo.processInfo.environment["AUDIVOX_YOUTUBE_CONVERTER_ENDPOINT"] ?? "",
      "AUDIVOX_WORKER_URL": ProcessInfo.processInfo.environment["AUDIVOX_WORKER_URL"] ?? "",
      "STRICT_MODE_ENABLED": true,
      "COMPROMISED_ENVIRONMENT": isCompromisedEnvironment(),
    ]
  }

  private func isCompromisedEnvironment() -> Bool {
    let suspiciousPaths = [
      "/Applications/Cydia.app",
      "/Library/MobileSubstrate/MobileSubstrate.dylib",
      "/bin/bash",
      "/usr/sbin/sshd",
      "/etc/apt",
      "/private/var/lib/apt/",
    ]

    if suspiciousPaths.contains(where: { FileManager.default.fileExists(atPath: $0) }) {
      return true
    }

    if ProcessInfo.processInfo.environment["DYLD_INSERT_LIBRARIES"] != nil {
      return true
    }

    let probePath = "/private/audivox-security-check"
    do {
      try "audivox".write(toFile: probePath, atomically: true, encoding: .utf8)
      try FileManager.default.removeItem(atPath: probePath)
      return true
    } catch {
      return false
    }
  }
}
