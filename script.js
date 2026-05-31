const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector("#site-menu");
const admissionForm = document.querySelector("#admission-form");
const formNote = document.querySelector("#form-note");
const heroVideo = document.querySelector("#hero-video");
const heroVideoSources = [
    "https://www.pexels.com/download/video/3288313/",
    "https://www.pexels.com/download/video/8935531/",
    "https://www.pexels.com/download/video/8363873/",
    "https://www.pexels.com/download/video/5198153/",
];
let heroVideoIndex = 0;

if (toggle && menu) {
    toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            menu.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
        });
    });
}

const STORAGE_KEY = "admissionEnquiries";

function getStoredEnquiries() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function storeEnquiry(entry) {
    const all = getStoredEnquiries();
    all.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all;
}

function formatEnquiriesAsTxt(enquiries) {
    if (!enquiries.length) return "No enquiries found.";

    return enquiries
        .map((e, idx) => {
            const d = new Date(e.createdAt);
            const createdAt = Number.isFinite(d.getTime()) ? d.toLocaleString() : e.createdAt;
            return [
                `#${idx + 1}`,
                `Created: ${createdAt}`,
                `Parent name: ${e.parentName || ""}`,
                `Student name: ${e.studentName || ""}`,
                `Class: ${e.className || ""}`,
                `Phone: ${e.phone || ""}`,
            ].join("\n");
        })
        .join("\n\n");
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

if (admissionForm && formNote) {
    admissionForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(admissionForm);

        const entry = {
            createdAt: new Date().toISOString(),
            parentName: String(data.get("parentName") || ""),
            studentName: String(data.get("studentName") || ""),
            className: String(data.get("className") || ""),
            phone: String(data.get("phone") || ""),
        };

        const studentName = entry.studentName || "the student";

        // 1) Try to store server-side into enquiries.txt
        fetch("/api/enquiry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            })
            .then((r) => r.json())
            .then((resp) => {
                // 2) Fallback to localStorage if server fails
                if (!resp || resp.ok !== true) {
                    storeEnquiry(entry);
                }
                formNote.textContent = `Thank you. The school office can contact you about admission for ${studentName}.`;
                admissionForm.reset();
            })
            .catch(() => {
                storeEnquiry(entry);
                formNote.textContent = `Thank you. The school office can contact you about admission for ${studentName}.`;
                admissionForm.reset();
            });

    });
}

if (heroVideo) {
    heroVideo.addEventListener("ended", () => {
        heroVideoIndex = (heroVideoIndex + 1) % heroVideoSources.length;
        heroVideo.src = heroVideoSources[heroVideoIndex];
        heroVideo.play().catch(() => {});
    });

    heroVideo.play().catch(() => {});
}
