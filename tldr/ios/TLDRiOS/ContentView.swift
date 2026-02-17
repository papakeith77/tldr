import SwiftUI
import AVFoundation

struct ThreadPayload: Decodable {
    struct Segment: Decodable, Identifiable {
        let id: String
        let text: String
    }

    let title: String
    let authorHandle: String?
    let sourceUrl: String?
    let segments: [Segment]
}

final class Speaker: ObservableObject {
    private let synth = AVSpeechSynthesizer()
    private var queue: [ThreadPayload.Segment] = []
    private var index: Int = 0

    @Published var isPlaying: Bool = false
    @Published var currentIndex: Int = 0

    init() {
        synth.delegate = self
    }

    func load(_ segments: [ThreadPayload.Segment]) {
        stop()
        queue = segments
        index = 0
        currentIndex = 0
    }

    func play(rate: Float = 0.5) {
        guard !queue.isEmpty else { return }
        if synth.isPaused {
            synth.continueSpeaking()
            isPlaying = true
            return
        }
        speakCurrent(rate: rate)
    }

    func pause() {
        synth.pauseSpeaking(at: .immediate)
        isPlaying = false
    }

    func stop() {
        synth.stopSpeaking(at: .immediate)
        isPlaying = false
    }

    func next(rate: Float = 0.5) {
        guard index + 1 < queue.count else { return }
        synth.stopSpeaking(at: .immediate)
        index += 1
        currentIndex = index
        speakCurrent(rate: rate)
    }

    func prev(rate: Float = 0.5) {
        guard index - 1 >= 0 else { return }
        synth.stopSpeaking(at: .immediate)
        index -= 1
        currentIndex = index
        speakCurrent(rate: rate)
    }

    private func speakCurrent(rate: Float) {
        guard index < queue.count else { isPlaying = false; return }
        let utter = AVSpeechUtterance(string: queue[index].text)
        utter.rate = rate // 0.0–1.0-ish; iOS uses its own scale
        utter.voice = AVSpeechSynthesisVoice(language: "en-US")
        isPlaying = true
        synth.speak(utter)
    }
}

extension Speaker: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            if self.index + 1 < self.queue.count {
                self.index += 1
                self.currentIndex = self.index
                self.speakCurrent(rate: utterance.rate)
            } else {
                self.isPlaying = false
            }
        }
    }
}

struct ContentView: View {
    // IMPORTANT: set this to your deployed web app (e.g., https://tldr-yourname.vercel.app)
    @State private var baseURL: String = "http://localhost:3000"
    @State private var url: String = ""
    @State private var payload: ThreadPayload? = nil
    @State private var errorText: String? = nil
    @State private var isLoading: Bool = false

    @StateObject private var speaker = Speaker()
    @State private var rate: Float = 0.5

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("TLDR").font(.largeTitle).bold()
                    Text("Paste an X thread link. Listen like a podcast.")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(spacing: 10) {
                    TextField("Base URL (your deployed TLDR)", text: $baseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    TextField("Paste X post URL…", text: $url)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)

                    HStack {
                        Button(isLoading ? "Fetching…" : "Fetch") {
                            Task { await fetchThread() }
                        }
                        .disabled(url.isEmpty || isLoading)

                        Button("Clear") {
                            url = ""
                            payload = nil
                            errorText = nil
                            speaker.stop()
                        }
                    }
                }

                if let errorText {
                    Text(errorText).foregroundColor(.red).frame(maxWidth: .infinity, alignment: .leading)
                }

                if let payload {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(payload.title).font(.headline)
                        if let h = payload.authorHandle { Text(h).foregroundColor(.secondary) }

                        HStack(spacing: 12) {
                            Button(speaker.isPlaying ? "Playing…" : "Play") { speaker.play(rate: rate) }
                                .disabled(payload.segments.isEmpty)
                            Button("Pause") { speaker.pause() }.disabled(payload.segments.isEmpty)
                            Button("Prev") { speaker.prev(rate: rate) }.disabled(payload.segments.isEmpty)
                            Button("Next") { speaker.next(rate: rate) }.disabled(payload.segments.isEmpty)
                        }

                        VStack(alignment: .leading) {
                            Text("Speed").font(.caption).foregroundColor(.secondary)
                            Slider(value: Binding(
                                get: { Double(rate) },
                                set: { rate = Float($0) }
                            ), in: 0.35...0.65)
                        }

                        List(payload.segments.indices, id: \.self) { i in
                            Text(payload.segments[i].text)
                                .font(.body)
                                .foregroundColor(i == speaker.currentIndex ? .primary : .secondary)
                                .onTapGesture {
                                    speaker.load(payload.segments)
                                    // jump to tapped segment
                                    for _ in 0..<i { speaker.next(rate: rate) }
                                }
                        }
                    }
                } else {
                    Spacer()
                }
            }
            .padding()
            .navigationBarHidden(true)
        }
    }

    private func fetchThread() async {
        errorText = nil
        isLoading = true
        speaker.stop()

        guard let endpoint = URL(string: baseURL + "/api/thread") else {
            errorText = "Bad base URL."
            isLoading = false
            return
        }

        do {
            var req = URLRequest(url: endpoint)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(["url": url])

            let (data, resp) = try await URLSession.shared.data(for: req)
            let http = resp as? HTTPURLResponse

            if let http, http.statusCode >= 400 {
                let msg = String(data: data, encoding: .utf8) ?? "Error"
                errorText = "Server error: \(http.statusCode)\n\(msg)"
                isLoading = false
                return
            }

            let decoded = try JSONDecoder().decode(ThreadPayload.self, from: data)
            payload = decoded
            speaker.load(decoded.segments)
        } catch {
            errorText = error.localizedDescription
        }

        isLoading = false
    }
}
