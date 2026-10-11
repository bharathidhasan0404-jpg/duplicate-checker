
const $ = id => document.getElementById(id);

const STORAGE_KEY = "leadiq-professional-v1";

const elements = {
    form: $("leadForm"),
    table: $("leadTable"),
    recent: $("recentTable"),
    search: $("searchInput"),
    quality: $("qualityFilter"),
    duplicate: $("duplicateFilter"),
    source: $("sourceFilter"),
    message: $("formMessage"),
    toast: $("toast"),
    csv: $("csvInput")
};

const sampleData = [
    {
        name: "Arun Kumar",
        email: "arun@example.com",
        phone: "9876543210",
        company: "TechNova Solutions",
        source: "Referral",
        budget: 85000,
        interest: "High",
        status: "Qualified",
        notes: "Interested in premium services"
    },
    {
        name: "Priya Sharma",
        email: "priya@example.com",
        phone: "9876501234",
        company: "BrightPath Digital",
        source: "LinkedIn",
        budget: 45000,
        interest: "Medium",
        status: "Contacted",
        notes: "Follow-up required"
    },
    {
        name: "Arun Kumar",
        email: "arun@example.com",
        phone: "9876543210",
        company: "TechNova Solutions",
        source: "Website",
        budget: 85000,
        interest: "High",
        status: "New",
        notes: "Possible duplicate record"
    },
    {
        name: "Karthik Raj",
        email: "karthik@example.com",
        phone: "9123456780",
        company: "Krypton Labs",
        source: "Advertisement",
        budget: 12000,
        interest: "Low",
        status: "New",
        notes: ""
    },
    {
        name: "Meena Devi",
        email: "meena@example.com",
        phone: "9000012345",
        company: "GreenLeaf Systems",
        source: "Website",
        budget: 65000,
        interest: "High",
        status: "Contacted",
        notes: "Requested a product demo"
    },
    {
        name: "Rahul Anand",
        email: "rahul@example.com",
        phone: "9012345678",
        company: "NextWave",
        source: "Referral",
        budget: 28000,
        interest: "Medium",
        status: "New",
        notes: ""
    }
];

let leads = loadLeads();
let toastTimer;
let importCounter = 0;

// -------------------- STORAGE --------------------

function loadLeads() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved !== null) {
            const data = JSON.parse(saved);
            if (Array.isArray(data)) {
                return data;
            }
        }
    } catch (error) {
        console.error("Could not load saved leads:", error);
    }

    // Demo data is created on first launch only.
    return sampleData.map((lead, index) => ({
        ...lead,
        id: index + 1,
        createdAt: new Date().toISOString()
    }));
}

function saveLeads() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
        return true;
    } catch (error) {
        console.error("Could not save leads:", error);
        showToast("Browser storage is unavailable or full.");
        return false;
    }
}

// -------------------- SCORING --------------------

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "");
}

function scoreParts(lead) {
    const interestPoints = {
        High: 40,
        Medium: 25,
        Low: 10
    };

    const sourcePoints = {
        Referral: 30,
        Website: 25,
        LinkedIn: 20,
        Advertisement: 15,
        Other: 10
    };

    const budget = Number(lead.budget) || 0;

    const budgetPoints =
        budget >= 50000 ? 30 :
        budget >= 20000 ? 20 : 10;

    return {
        interest: interestPoints[lead.interest] || 10,
        budget: budgetPoints,
        source: sourcePoints[lead.source] || 10
    };
}

function calculateScore(lead) {
    const parts = scoreParts(lead);
    return Math.min(100, parts.interest + parts.budget + parts.source);
}

function getQuality(score) {
    if (score >= 70) return "High";
    if (score >= 45) return "Medium";
    return "Low";
}

function enrichLead(lead) {
    const score = calculateScore(lead);

    return {
        ...lead,
        score,
        quality: getQuality(score)
    };
}

// -------------------- DUPLICATE CHECKING --------------------

function getDuplicateIds(records = leads) {
    const emailGroups = new Map();
    const phoneGroups = new Map();

    records.forEach(lead => {
        const email = normalizeEmail(lead.email);
        const phone = normalizePhone(lead.phone);

        if (email) {
            if (!emailGroups.has(email)) emailGroups.set(email, []);
            emailGroups.get(email).push(lead.id);
        }

        if (phone) {
            if (!phoneGroups.has(phone)) phoneGroups.set(phone, []);
            phoneGroups.get(phone).push(lead.id);
        }
    });

    const duplicateIds = new Set();

    [emailGroups, phoneGroups].forEach(groups => {
        groups.forEach(ids => {
            if (ids.length > 1) {
                ids.forEach(id => duplicateIds.add(id));
            }
        });
    });

    return duplicateIds;
}

function hasDuplicateContact(lead, ignoreId = null) {
    return leads.some(other => {
        if (other.id === ignoreId) return false;

        const emailMatches =
            normalizeEmail(other.email) === normalizeEmail(lead.email);

        const phoneMatches =
            normalizePhone(other.phone) === normalizePhone(lead.phone);

        return emailMatches || phoneMatches;
    });
}

// -------------------- UTILITIES --------------------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function initials(name) {
    return String(name || "Lead")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function qualityClass(quality) {
    return quality.toLowerCase() + "-pill";
}

function statusClass(status) {
    const classes = {
        New: "medium-pill",
        Contacted: "unique-pill",
        Qualified: "high-pill",
        Converted: "high-pill",
        Lost: "low-pill"
    };

    return classes[status] || "medium-pill";
}

function showToast(text) {
    elements.toast.textContent = text;
    elements.toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2800);
}

// -------------------- LEAD FORM --------------------

function getFormLead() {
    return {
        name: $("name").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value.trim(),
        company: $("company").value.trim(),
        source: $("source").value,
        budget: Number($("budget").value),
        interest: $("interest").value,
        status: $("status").value,
        notes: $("notes").value.trim()
    };
}

function showPreview() {
    const lead = getFormLead();
    const parts = scoreParts(lead);
    const score = parts.interest + parts.budget + parts.source;
    const quality = getQuality(score);

    $("previewScore").textContent = score;
    $("previewBar").style.width = score + "%";
    $("previewQuality").textContent = quality.toUpperCase() + " QUALITY";
    $("previewQuality").className = "quality-pill " + qualityClass(quality);

    $("interestPoints").textContent = parts.interest + " pts";
    $("budgetPoints").textContent = parts.budget + " pts";
    $("sourcePoints").textContent = parts.source + " pts";
}

function resetLeadForm() {
    elements.form.reset();
    $("editId").value = "";
    $("formTitle").textContent = "Create a New Lead";
    $("saveBtn").textContent = "✦ Analyze & Save Lead";
    $("formMessage").textContent = "";
    showPreview();
}

function openLeadForm(lead = null) {
    resetLeadForm();

    if (lead) {
        $("editId").value = lead.id;
        $("name").value = lead.name || "";
        $("email").value = lead.email || "";
        $("phone").value = lead.phone || "";
        $("company").value = lead.company || "";
        $("source").value = lead.source || "Website";
        $("budget").value = lead.budget ?? 0;
        $("interest").value = lead.interest || "Medium";
        $("status").value = lead.status || "New";
        $("notes").value = lead.notes || "";

        $("formTitle").textContent = "Edit Lead Details";
        $("saveBtn").textContent = "Save Lead Changes";
    }

    showPreview();
    location.hash = "#add-lead";
}

elements.form.addEventListener("submit", event => {
    event.preventDefault();

    const lead = getFormLead();
    const editId = $("editId").value;

    if (!lead.name || !lead.email || !lead.phone) {
        $("formMessage").textContent =
            "Please complete all required contact fields.";
        return;
    }

    if (!Number.isFinite(lead.budget) || lead.budget < 0 ||
        lead.budget > 1000000000) {
        $("formMessage").textContent = "Enter a valid budget.";
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(lead.email)) {
        $("formMessage").textContent =
            "Please enter a valid email address.";
        return;
    }

    const phoneDigits = normalizePhone(lead.phone);

    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        $("formMessage").textContent =
            "Enter a phone number containing 7 to 15 digits.";
        return;
    }

    const duplicate = hasDuplicateContact(lead, editId || null);

    if (editId) {
        const index = leads.findIndex(item => item.id === Number(editId));

        if (index === -1) {
            showToast("This lead could not be found.");
            return;
        }

        leads[index] = {
            ...leads[index],
            ...lead,
            id: Number(editId)
        };

        saveLeads();
        renderAll();
        resetLeadForm();
        showToast(duplicate
            ? "Lead updated. Matching contact details detected."
            : "Lead updated successfully.");
        location.hash = "#leads";
        return;
    }

    const newLead = {
        ...lead,
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString()
    };

    leads.unshift(newLead);

    saveLeads();
    renderAll();
    resetLeadForm();

    showToast(duplicate
        ? "Lead saved with a duplicate warning."
        : "Lead analyzed and saved successfully.");

    location.hash = "#leads";
});

// Live score preview
[
    "source", "budget", "interest"
].forEach(id => {
    $(id).addEventListener("input", showPreview);
});

// -------------------- RENDER DASHBOARD --------------------

function renderDashboard() {
    const enriched = leads.map(enrichLead);
    const duplicateIds = getDuplicateIds(leads);

    const total = enriched.length;
    const high = enriched.filter(lead => lead.quality === "High").length;
    const medium = enriched.filter(lead => lead.quality === "Medium").length;
    const low = enriched.filter(lead => lead.quality === "Low").length;
    const duplicates = duplicateIds.size;

    const average = total
        ? Math.round(enriched.reduce((sum, lead) => sum + lead.score, 0) / total)
        : 0;

    $("totalLeads").textContent = total;
    $("highLeads").textContent = high;
    $("duplicateLeads").textContent = duplicates;
    $("averageScore").innerHTML =
        average + '<span class="small-unit">/100</span>';

    $("totalTrack").style.width = (total ? 100 : 0) + "%";
    $("highTrack").style.width = (total ? high / total * 100 : 0) + "%";
    $("duplicateTrack").style.width =
        (total ? duplicates / total * 100 : 0) + "%";
    $("averageTrack").style.width = average + "%";

    $("donutTotal").textContent = total;
    $("legendHigh").textContent = high;
    $("legendMedium").textContent = medium;
    $("legendLow").textContent = low;

    const highPct = total ? high / total * 100 : 0;
    const mediumPct = total ? medium / total * 100 : 0;
    const lowPct = total ? low / total * 100 : 0;

    $("qualityDonut").style.background = total
        ? `conic-gradient(
            #14b88a 0% ${highPct}%,
            #f4b942 ${highPct}% ${highPct + mediumPct}%,
            #f16c7b ${highPct + mediumPct}% 100%
        )`
        : "conic-gradient(#e9ebf4 0% 100%)";

    renderSourceChart(enriched);
    renderRecentTable(enriched, duplicateIds);
}

function renderSourceChart(enriched) {
    const sources = [
        "Website", "Referral", "LinkedIn", "Advertisement", "Other"
    ];

    const counts = Object.fromEntries(sources.map(source => [source, 0]));

    enriched.forEach(lead => {
        counts[lead.source] = (counts[lead.source] || 0) + 1;
    });

    const maxCount = Math.max(1, ...Object.values(counts));

    $("sourceChart").innerHTML = sources.map(source => {
        const count = counts[source] || 0;
        const width = count / maxCount * 100;

        return `
            <div class="source-row">
                <div class="source-label">
                    <span>${escapeHTML(source)}</span>
                    <strong>${count}</strong>
                </div>
                <div class="source-track">
                    <span style="width:${width}%"></span>
                </div>
            </div>
        `;
    }).join("");
}

function renderRecentTable(enriched, duplicateIds) {
    const recent = [...enriched]
        .sort((a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
        .slice(0, 5);

    if (!recent.length) {
        $("recentTable").innerHTML =
            '<tr><td colspan="5">No leads available yet.</td></tr>';
        return;
    }

    $("recentTable").innerHTML = recent.map(lead => `
        <tr>
            <td>
                <div class="lead-person">
                    <div class="lead-avatar">${escapeHTML(initials(lead.name))}</div>
                    <div>
                        <strong>${escapeHTML(lead.name)}</strong>
                        <small>${escapeHTML(lead.email)}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(lead.source)}</td>
            <td>${lead.score}/100</td>
            <td><span class="quality-pill ${qualityClass(lead.quality)}">${lead.quality}</span></td>
            <td><span class="status-pill ${duplicateIds.has(lead.id) ? "duplicate-pill" : statusClass(lead.status)}">${duplicateIds.has(lead.id) ? "Duplicate" : escapeHTML(lead.status || "New")}</span></td>
        </tr>
    `).join("");
}

// -------------------- LEAD MANAGEMENT --------------------

function renderLeadTable() {
    const search = elements.search.value.trim().toLowerCase();
    const selectedQuality = elements.quality.value;
    const selectedDuplicate = elements.duplicate.value;
    const selectedSource = elements.source.value;

    const duplicateIds = getDuplicateIds(leads);

    const filtered = leads
        .map(enrichLead)
        .filter(lead => {
            const searchable = [
                lead.name, lead.email, lead.phone,
                lead.company, lead.source, lead.status
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(search);
            const matchesQuality =
                selectedQuality === "All" ||
                lead.quality === selectedQuality;

            const duplicate = duplicateIds.has(lead.id);

            const matchesDuplicate =
                selectedDuplicate === "All" ||
                (selectedDuplicate === "Duplicate" && duplicate) ||
                (selectedDuplicate === "Unique" && !duplicate);

            const matchesSource =
                selectedSource === "All" || lead.source === selectedSource;

            return matchesSearch && matchesQuality &&
                matchesDuplicate && matchesSource;
        });

    $("resultsCount").textContent =
        `${filtered.length} of ${leads.length} records`;

    $("emptyState").hidden = filtered.length !== 0;
    elements.table.closest(".table-wrap").hidden = filtered.length === 0;

    elements.table.innerHTML = filtered.map(lead => {
        const duplicate = duplicateIds.has(lead.id);

        return `
            <tr>
                <td>
                    <div class="lead-person">
                        <div class="lead-avatar">${escapeHTML(initials(lead.name))}</div>
                        <div>
                            <strong>${escapeHTML(lead.name)}</strong>
                            <small>${escapeHTML(lead.email)}</small>
                            <small>${escapeHTML(lead.phone)}${lead.company ? " · " + escapeHTML(lead.company) : ""}</small>
                        </div>
                    </div>
                </td>
                <td>${escapeHTML(lead.source)}</td>
                <td>${money(lead.budget)}</td>
                <td>
                    <div class="score-cell">
                        <strong>${lead.score}/100</strong>
                        <div class="score-mini"><span style="width:${lead.score}%"></span></div>
                    </div>
                </td>
                <td><span class="quality-pill ${qualityClass(lead.quality)}">${lead.quality}</span></td>
                <td><span class="status-pill ${duplicate ? "duplicate-pill" : "unique-pill"}">${duplicate ? "Duplicate" : "Unique"}</span></td>
                <td>
                    <div class="action-group">
                        <button class="action-btn" data-action="edit" data-id="${lead.id}" title="Edit lead" aria-label="Edit ${escapeHTML(lead.name)}">✎</button>
                        <button class="action-btn delete" data-action="delete" data-id="${lead.id}" title="Delete lead" aria-label="Delete ${escapeHTML(lead.name)}">×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

elements.table.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const lead = leads.find(item => item.id === id);

    if (!lead) return;

    if (button.dataset.action === "edit") {
        openLeadForm(lead);
    }

    if (button.dataset.action === "delete") {
        const confirmed = confirm(
            `Delete the lead "${lead.name}"? This cannot be undone.`
        );

        if (!confirmed) return;

        leads = leads.filter(item => item.id !== id);
        saveLeads();
        renderAll();
        showToast("Lead deleted.");
    }
});

[
    elements.search,
    elements.quality,
    elements.duplicate,
    elements.source
].forEach(element => {
    element.addEventListener(
        element === elements.search ? "input" : "change",
        renderLeadTable
    );
});

// -------------------- CSV EXPORT --------------------

function csvCell(value) {
    let text = String(value ?? "");

    // Protect spreadsheet applications from formula injection.
    if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
}

function exportCSV() {
    if (!leads.length) {
        showToast("There are no leads to export.");
        return;
    }

    const duplicateIds = getDuplicateIds(leads);

    const headers = [
        "Name", "Email", "Phone", "Company", "Source",
        "Budget", "Interest", "Status", "Notes",
        "Score", "Quality", "Duplicate"
    ];

    const rows = leads.map(raw => {
        const lead = enrichLead(raw);

        return [
            lead.name, lead.email, lead.phone, lead.company,
            lead.source, lead.budget, lead.interest, lead.status,
            lead.notes, lead.score, lead.quality,
            duplicateIds.has(lead.id) ? "Yes" : "No"
        ];
    });

    const csv = [headers, ...rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "LeadIQ_Report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Lead report exported successfully.");
}

// -------------------- CSV IMPORT --------------------

// Handles commas and quoted values inside CSV fields.
function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
        const character = text[i];

        if (quoted) {
            if (character === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (character === '"') {
                quoted = false;
            } else {
                cell += character;
            }
        } else if (character === '"' && cell.length === 0) {
            quoted = true;
        } else if (character === ",") {
            row.push(cell);
            cell = "";
        } else if (character === "\n" || character === "\r") {
            if (character === "\r" && text[i + 1] === "\n") i++;

            row.push(cell);
            if (row.some(value => value.trim() !== "")) rows.push(row);

            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }

    if (quoted) throw new Error("CSV contains an unclosed quotation mark.");

    if (cell.length || row.length) {
        row.push(cell);
        if (row.some(value => value.trim() !== "")) rows.push(row);
    }

    return rows;
}

function importCSV(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast("CSV must be smaller than 5 MB.");
        elements.csv.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const rows = parseCSV(String(reader.result || ""));

            if (rows.length < 2) {
                throw new Error("CSV must contain a header and at least one record.");
            }

            const headers = rows[0].map(value =>
                value.trim().toLowerCase().replace(/^\uFEFF/, "")
            );

            const column = (...names) =>
                headers.findIndex(header => names.includes(header));

            const nameIndex = column("name", "full name", "fullname");
            const emailIndex = column("email", "email address");
            const phoneIndex = column("phone", "phone number", "mobile");

            if ([nameIndex, emailIndex, phoneIndex].some(i => i === -1)) {
                throw new Error("CSV must have Name, Email and Phone columns.");
            }

            const getValue = (row, index, fallback = "") =>
                index < 0 ? fallback : String(row[index] ?? "").trim();

            const imported = [];
            const errors = [];

            rows.slice(1).forEach((row, rowIndex) => {
                const name = getValue(row, nameIndex);
                const email = getValue(row, emailIndex);
                const phone = getValue(row, phoneIndex);

                if (!name || !email || !phone) {
                    errors.push(rowIndex + 2);
                    return;
                }

                const budgetText = getValue(
                    row, column("budget", "estimated budget"), "0"
                );

                const budget = Number(budgetText);

                if (!Number.isFinite(budget) || budget < 0 ||
                    budget > 1000000000) {
                    errors.push(rowIndex + 2);
                    return;
                }

                const source = getValue(row, column("source", "lead source"), "Other");
                const interest = getValue(row, column("interest", "interest level"), "Medium");
                const status = getValue(row, column("status", "pipeline status"), "New");

                const allowedSources = [
                    "Website", "LinkedIn", "Referral", "Advertisement", "Other"
                ];

                const allowedInterests = ["High", "Medium", "Low"];
                const allowedStatuses = [
                    "New", "Contacted", "Qualified", "Converted", "Lost"
                ];

                const lead = {
                    name,
                    email,
                    phone,
                    company: getValue(row, column("company"), ""),
                    source: allowedSources.includes(source) ? source : "Other",
                    budget,
                    interest: allowedInterests.includes(interest) ? interest : "Medium",
                    status: allowedStatuses.includes(status) ? status : "New",
                    notes: getValue(row, column("notes"), ""),
                    id: Date.now() + (++importCounter),
                    createdAt: new Date().toISOString()
                };

                imported.push(lead);
            });

            if (!imported.length) {
                throw new Error("No valid lead records were found in this CSV.");
            }

            leads = [...imported, ...leads];
            saveLeads();
            renderAll();

            showToast(
                `${imported.length} leads imported.` +
                (errors.length ? ` Skipped ${errors.length} invalid rows.` : "")
            );
        } catch (error) {
            showToast(error.message || "Could not import this CSV.");
        } finally {
            elements.csv.value = "";
        }
    };

    reader.onerror = () => {
        showToast("Could not read the selected CSV file.");
        elements.csv.value = "";
    };

    reader.readAsText(file);
}

// -------------------- NAVIGATION & THEME --------------------

function toggleTheme() {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    try {
        localStorage.setItem("leadiq-theme", dark ? "dark" : "light");
    } catch (error) {
        // Theme still works for this page session.
    }
}

try {
    if (localStorage.getItem("leadiq-theme") === "dark") {
        document.body.classList.add("dark");
    }
} catch (error) {
    // Use the default light theme.
}

$("themeBtn").addEventListener("click", toggleTheme);
$("topThemeBtn").addEventListener("click", toggleTheme);

$("heroAddBtn").addEventListener("click", () => openLeadForm());
$("tableAddBtn").addEventListener("click", () => openLeadForm());
$("emptyAddBtn").addEventListener("click", () => openLeadForm());
$("resetFormBtn").addEventListener("click", resetLeadForm);

$("exportBtn").addEventListener("click", exportCSV);
$("sidebarExport").addEventListener("click", exportCSV);

$("sidebarImport").addEventListener("click", () => elements.csv.click());

elements.csv.addEventListener("change", () => {
    const file = elements.csv.files[0];
    if (file) importCSV(file);
});

$("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

document.querySelectorAll(".nav-link[href]").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link[href]").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
        $("pageLabel").textContent = link.textContent.trim();
        $("sidebar").classList.remove("open");
    });
});

window.addEventListener("hashchange", () => {
    const hash = location.hash;
    const links = document.querySelectorAll(".nav-link[href]");

    links.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === hash);
    });

    const activeLink = document.querySelector(".nav-link[href].active");

    if (activeLink) {
        $("pageLabel").textContent = activeLink.textContent.trim();
    }
});

// -------------------- INITIALIZATION --------------------

function renderAll() {
    renderDashboard();
    renderLeadTable();
}

renderAll();
showPreview();
saveLeads();
