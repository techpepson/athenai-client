/**
 * Seed data for the Modules & Timetable system.
 * Based on College of Medicine and Allied Sciences (COMAS) curriculum.
 * Auto-seeds localStorage when no modules exist.
 */

import { Module, ModuleTimetable, TimetableSlot } from "./modules.service";

const MODULES_STORAGE_KEY = "college_modules";
const TIMETABLES_STORAGE_KEY = "college_timetables";

let idCounter = 1;
const genId = () => `seed-${idCounter++}`;

const makeSubtopic = (
    name: string,
    lecturerName: string,
    weeks: number,
    hoursPerWeek: number
) => ({
    id: genId(),
    name,
    lecturerName,
    weeks,
    hoursPerWeek,
});

const now = new Date().toISOString();

// ============================
// LEVEL 100 — SEMESTER 1
// ============================
const LEVEL_100_SEM_1: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 103",
        name: "Professional and Behavioural Studies",
        credits: 6,
        level: 100,
        semester: 1,
        order: 1,
        subtopics: [
            makeSubtopic("Medical Professionalism", "Dr. Ama Mensah", 2, 4),
            makeSubtopic("Communication Skills in Healthcare", "Dr. Kwesi Ansah", 2, 3),
            makeSubtopic("Ethics in Medical Practice", "Prof. Abena Owusu", 2, 4),
            makeSubtopic("Behavioural Sciences Foundation", "Dr. Kofi Asante", 2, 3),
        ],
    },
    {
        code: "CMPC 102",
        name: "Basic French I",
        credits: 4,
        level: 100,
        semester: 1,
        order: 2,
        subtopics: [
            makeSubtopic("French Grammar Basics", "Mr. Jean-Pierre Dufour", 3, 2),
            makeSubtopic("Medical French Vocabulary", "Mme. Claire Bonnet", 3, 2),
        ],
    },
    {
        code: "CMPC 101",
        name: "Human Body Structure and Function I",
        credits: 6,
        level: 100,
        semester: 1,
        order: 3,
        subtopics: [
            makeSubtopic("Gross Anatomy - Upper Limb", "Prof. Yaw Boateng", 2, 5),
            makeSubtopic("Gross Anatomy - Lower Limb", "Prof. Yaw Boateng", 2, 5),
            makeSubtopic("Histology of Basic Tissues", "Dr. Akua Sarpong", 2, 4),
            makeSubtopic("Basic Physiology", "Dr. Esi Donkor", 2, 4),
        ],
    },
    {
        code: "CMPC 104",
        name: "Nutrition and Metabolism",
        credits: 9,
        level: 100,
        semester: 1,
        order: 4,
        subtopics: [
            makeSubtopic("Biochemistry of Macronutrients", "Prof. Daniel Adjei", 3, 4),
            makeSubtopic("Micronutrients and Minerals", "Dr. Grace Amponsah", 2, 3),
            makeSubtopic("Metabolic Pathways", "Prof. Daniel Adjei", 3, 5),
            makeSubtopic("Clinical Nutrition", "Dr. Mercy Oppong", 2, 3),
        ],
    },
    {
        code: "CMPC 105",
        name: "Student Selected Project",
        credits: 3,
        level: 100,
        semester: 1,
        order: 5,
        subtopics: [
            makeSubtopic("Research Methodology", "Dr. Samuel Tetteh", 2, 2),
            makeSubtopic("Project Proposal Development", "Dr. Samuel Tetteh", 2, 2),
            makeSubtopic("Data Collection and Analysis", "Dr. Lydia Mensah", 2, 3),
        ],
    },
];

// ============================
// LEVEL 200 — SEMESTER 1
// ============================
const LEVEL_200_SEM_1: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 201",
        name: "Human Body Structure and Function II",
        credits: 6,
        level: 200,
        semester: 1,
        order: 1,
        subtopics: [
            makeSubtopic("Anatomy of Thorax", "Prof. Yaw Boateng", 2, 5),
            makeSubtopic("Anatomy of Abdomen", "Prof. Yaw Boateng", 2, 5),
            makeSubtopic("Cardiovascular Physiology", "Dr. Esi Donkor", 2, 4),
        ],
    },
    {
        code: "CMPC 210",
        name: "Human Body Structure and Function III",
        credits: 6,
        level: 200,
        semester: 1,
        order: 2,
        subtopics: [
            makeSubtopic("Head and Neck Anatomy", "Dr. Benjamin Quarshie", 3, 4),
            makeSubtopic("Respiratory Physiology", "Dr. Esi Donkor", 2, 4),
            makeSubtopic("Gastrointestinal Physiology", "Dr. Frank Oduro", 2, 3),
        ],
    },
    {
        code: "CMPC 208",
        name: "Neuroscience I",
        credits: 6,
        level: 200,
        semester: 1,
        order: 3,
        subtopics: [
            makeSubtopic("Neuroanatomy Fundamentals", "Prof. Sarah Mensah", 2, 5),
            makeSubtopic("Neurophysiology", "Prof. Sarah Mensah", 2, 4),
            makeSubtopic("Sensory Systems", "Dr. Emmanuel Osei", 2, 4),
        ],
    },
    {
        code: "CMPC 203",
        name: "Cell Biology and Basic Pharmacology",
        credits: 6,
        level: 200,
        semester: 1,
        order: 4,
        subtopics: [
            makeSubtopic("Cell Structure and Function", "Dr. Patricia Antwi", 2, 4),
            makeSubtopic("Cell Signaling and Communication", "Dr. Patricia Antwi", 2, 3),
            makeSubtopic("Pharmacokinetics", "Prof. Richard Amoako", 2, 4),
            makeSubtopic("Pharmacodynamics", "Prof. Richard Amoako", 2, 4),
        ],
    },
    {
        code: "CMPC 204",
        name: "Basic French II",
        credits: 2,
        level: 200,
        semester: 1,
        order: 5,
        subtopics: [
            makeSubtopic("Intermediate French Grammar", "Mr. Jean-Pierre Dufour", 3, 2),
            makeSubtopic("Medical French Conversation", "Mme. Claire Bonnet", 3, 2),
        ],
    },
];

// ============================
// LEVEL 200 — SEMESTER 2
// ============================
const LEVEL_200_SEM_2: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 206",
        name: "Clinical Haematology and Blood Transfusion",
        credits: 3,
        level: 200,
        semester: 2,
        order: 1,
        subtopics: [
            makeSubtopic("Haematopoiesis and Blood Components", "Dr. Alberta Quaye", 2, 3),
            makeSubtopic("Blood Transfusion Science", "Dr. Alberta Quaye", 2, 3),
        ],
    },
    {
        code: "CMPC 207",
        name: "Human Pathogens and Diseases",
        credits: 7,
        level: 200,
        semester: 2,
        order: 2,
        subtopics: [
            makeSubtopic("Medical Bacteriology", "Prof. Isaac Badu", 2, 4),
            makeSubtopic("Medical Virology", "Dr. Janet Gyamfi", 2, 4),
            makeSubtopic("Medical Parasitology", "Dr. Maxwell Asiedu", 2, 4),
            makeSubtopic("Medical Mycology", "Dr. Janet Gyamfi", 1, 3),
        ],
    },
    {
        code: "CMPC 205",
        name: "Processes and Mechanisms of Disease",
        credits: 4,
        level: 200,
        semester: 2,
        order: 3,
        subtopics: [
            makeSubtopic("Inflammation and Repair", "Prof. Comfort Adu", 2, 4),
            makeSubtopic("Neoplasia", "Prof. Comfort Adu", 2, 4),
            makeSubtopic("Immunopathology", "Dr. Lawrence Nyarko", 2, 3),
        ],
    },
    {
        code: "CMPC 209",
        name: "Elementary French I",
        credits: 2,
        level: 200,
        semester: 2,
        order: 4,
        subtopics: [
            makeSubtopic("Elementary French Reading", "Mme. Claire Bonnet", 3, 2),
            makeSubtopic("Elementary French Writing", "Mr. Jean-Pierre Dufour", 3, 2),
        ],
    },
    {
        code: "CMPC 211",
        name: "Community-Based Interaction",
        credits: 3,
        level: 200,
        semester: 2,
        order: 5,
        subtopics: [
            makeSubtopic("Community Health Assessment", "Dr. Martin Awuku", 2, 3),
            makeSubtopic("Community Engagement Project", "Dr. Martin Awuku", 2, 3),
        ],
    },
    {
        code: "CMPC 298",
        name: "Professional Examination",
        credits: 9,
        level: 200,
        semester: 2,
        order: 6,
        subtopics: [
            makeSubtopic("Written Examination Preparation", "Prof. Comfort Adu", 2, 5),
            makeSubtopic("OSCE Preparation", "Dr. Alberta Quaye", 2, 5),
            makeSubtopic("Viva Voce Preparation", "Prof. Isaac Badu", 2, 4),
        ],
    },
];

// ============================
// LEVEL 300 — SEMESTER 1
// ============================
const LEVEL_300_SEM_1: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 301",
        name: "Introduction to Clinical Studies and Medical Ethics",
        credits: 4,
        level: 300,
        semester: 1,
        order: 1,
        subtopics: [
            makeSubtopic("History Taking and Physical Examination", "Dr. Nana Agyeman", 2, 4),
            makeSubtopic("Medical Ethics and Law", "Prof. Abena Owusu", 2, 3),
        ],
    },
    {
        code: "CMPC 303",
        name: "Diseases of Cardio-Pulmonary Systems",
        credits: 4,
        level: 300,
        semester: 1,
        order: 2,
        subtopics: [
            makeSubtopic("Cardiovascular Diseases", "Prof. James Ankra", 2, 5),
            makeSubtopic("Pulmonary Diseases", "Dr. Helen Opoku", 2, 4),
        ],
    },
    {
        code: "CMPC 305",
        name: "Diseases of Alimentary and Renal Systems",
        credits: 4,
        level: 300,
        semester: 1,
        order: 3,
        subtopics: [
            makeSubtopic("GIT Disorders", "Dr. Peter Ansong", 2, 4),
            makeSubtopic("Renal Disorders", "Dr. Vida Amoah", 2, 4),
        ],
    },
    {
        code: "CMPC 307",
        name: "Clinical Haematology and Blood Transfusion II",
        credits: 3,
        level: 300,
        semester: 1,
        order: 4,
        subtopics: [
            makeSubtopic("Haemoglobinopathies", "Dr. Alberta Quaye", 2, 3),
            makeSubtopic("Coagulation Disorders", "Dr. Alberta Quaye", 2, 3),
        ],
    },
    {
        code: "CMPC 309",
        name: "Elementary French II",
        credits: 2,
        level: 300,
        semester: 1,
        order: 5,
        subtopics: [
            makeSubtopic("French for Medical Professionals", "Mme. Claire Bonnet", 4, 2),
        ],
    },
    {
        code: "CMPC 311",
        name: "Junior Clerkship in Medicine",
        credits: 9,
        level: 300,
        semester: 1,
        order: 6,
        subtopics: [
            makeSubtopic("Medical Ward Clerkship", "Prof. James Ankra", 4, 8),
            makeSubtopic("Outpatient Clinic Attachment", "Dr. Nana Agyeman", 3, 6),
        ],
    },
    {
        code: "CMPC 313",
        name: "Junior Clerkship in Surgery",
        credits: 9,
        level: 300,
        semester: 1,
        order: 7,
        subtopics: [
            makeSubtopic("Surgical Ward Clerkship", "Prof. Charles Baidoo", 4, 8),
            makeSubtopic("Emergency Surgery Rotation", "Dr. Francis Kumah", 3, 6),
        ],
    },
    {
        code: "CMPC 302",
        name: "Clinical Neuroscience",
        credits: 4,
        level: 300,
        semester: 1,
        order: 8,
        subtopics: [
            makeSubtopic("Clinical Neuroanatomy", "Prof. Sarah Mensah", 2, 4),
            makeSubtopic("Neurological Examination", "Dr. Emmanuel Osei", 2, 4),
        ],
    },
];

// ============================
// LEVEL 300 — SEMESTER 2
// ============================
const LEVEL_300_SEM_2: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 314",
        name: "Clinical Clerkship in Dermatology",
        credits: 3,
        level: 300,
        semester: 2,
        order: 1,
        subtopics: [
            makeSubtopic("Common Dermatological Conditions", "Dr. Esther Darko", 2, 4),
            makeSubtopic("Dermatology Clinic Rotation", "Dr. Esther Darko", 2, 4),
        ],
    },
    {
        code: "CMPC 308",
        name: "Forensic Medicine and Toxicology",
        credits: 4,
        level: 300,
        semester: 2,
        order: 2,
        subtopics: [
            makeSubtopic("Forensic Pathology", "Dr. George Amissah", 2, 4),
            makeSubtopic("Clinical Toxicology", "Dr. George Amissah", 2, 3),
        ],
    },
    {
        code: "CMPC 304",
        name: "Diseases of Musculoskeletal and Integumentary System",
        credits: 4,
        level: 300,
        semester: 2,
        order: 3,
        subtopics: [
            makeSubtopic("Orthopaedic Conditions", "Dr. William Buadi", 2, 4),
            makeSubtopic("Rheumatology", "Dr. Hannah Yeboah", 2, 3),
        ],
    },
    {
        code: "CMPC 306",
        name: "Diagnostics in Healthcare I",
        credits: 3,
        level: 300,
        semester: 2,
        order: 4,
        subtopics: [
            makeSubtopic("Clinical Laboratory Diagnostics", "Dr. Patience Nkrumah", 2, 4),
            makeSubtopic("Imaging Diagnostics", "Dr. Michael Frimpong", 2, 3),
        ],
    },
    {
        code: "CMPC 310",
        name: "Public Health and Population Medicine I",
        credits: 4,
        level: 300,
        semester: 2,
        order: 5,
        subtopics: [
            makeSubtopic("Epidemiology Basics", "Prof. Martin Awuku", 2, 4),
            makeSubtopic("Biostatistics", "Dr. Lydia Mensah", 2, 3),
        ],
    },
    {
        code: "CMPC 312",
        name: "Lower Intermediate French I",
        credits: 2,
        level: 300,
        semester: 2,
        order: 6,
        subtopics: [
            makeSubtopic("French Medical Communication", "Mme. Claire Bonnet", 4, 2),
        ],
    },
    {
        code: "CMPC 316",
        name: "Clinical Clerkship in EENT",
        credits: 4,
        level: 300,
        semester: 2,
        order: 7,
        subtopics: [
            makeSubtopic("Ophthalmology Rotation", "Dr. Sophia Addo", 2, 4),
            makeSubtopic("ENT Rotation", "Dr. Alex Tawiah", 2, 4),
        ],
    },
];

// ============================
// LEVEL 400 — SEMESTER 1
// ============================
const LEVEL_400_SEM_1: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 401",
        name: "Family Medicine and Geriatrics",
        credits: 3,
        level: 400,
        semester: 1,
        order: 1,
        subtopics: [
            makeSubtopic("Principles of Family Medicine", "Dr. Rebecca Asamoah", 2, 3),
            makeSubtopic("Geriatric Medicine", "Dr. Rebecca Asamoah", 2, 3),
        ],
    },
    {
        code: "CMPC 403",
        name: "Endocrine, Reproduction and Growth",
        credits: 7,
        level: 400,
        semester: 1,
        order: 2,
        subtopics: [
            makeSubtopic("Endocrine Disorders", "Prof. Rita Larbi", 2, 5),
            makeSubtopic("Reproductive Medicine", "Dr. Josephine Quansah", 2, 4),
            makeSubtopic("Growth and Development", "Dr. Josephine Quansah", 2, 4),
        ],
    },
    {
        code: "CMPC 405",
        name: "Mental Health",
        credits: 3,
        level: 400,
        semester: 1,
        order: 3,
        subtopics: [
            makeSubtopic("Psychiatry Fundamentals", "Dr. Vincent Ofosu", 2, 4),
            makeSubtopic("Psychopharmacology", "Dr. Vincent Ofosu", 2, 3),
        ],
    },
    {
        code: "CMPC 407",
        name: "Diagnostics in Healthcare II",
        credits: 3,
        level: 400,
        semester: 1,
        order: 4,
        subtopics: [
            makeSubtopic("Advanced Imaging", "Dr. Michael Frimpong", 2, 3),
            makeSubtopic("Point-of-Care Testing", "Dr. Patience Nkrumah", 2, 3),
        ],
    },
    {
        code: "CMPC 409",
        name: "Lower Intermediate French 2",
        credits: 2,
        level: 400,
        semester: 1,
        order: 5,
        subtopics: [
            makeSubtopic("French Medical Seminar", "Mr. Jean-Pierre Dufour", 4, 2),
        ],
    },
    {
        code: "CMPC 411",
        name: "Junior Clinical Clerkship Obstetrics & Gynaecology",
        credits: 10,
        level: 400,
        semester: 1,
        order: 6,
        subtopics: [
            makeSubtopic("Obstetrics Rotation", "Prof. Gertrude Addo", 4, 8),
            makeSubtopic("Gynaecology Rotation", "Dr. Margaret Forson", 4, 6),
        ],
    },
    {
        code: "CMPC 413",
        name: "Junior Clinical Clerkship in Paediatrics",
        credits: 10,
        level: 400,
        semester: 1,
        order: 7,
        subtopics: [
            makeSubtopic("General Paediatrics Ward", "Prof. Ernest Kusi", 4, 8),
            makeSubtopic("Neonatology Rotation", "Dr. Bridget Owusu", 4, 6),
        ],
    },
];

// ============================
// LEVEL 400 — SEMESTER 2
// ============================
const LEVEL_400_SEM_2: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 402",
        name: "Family Medicine and Geriatrics",
        credits: 3,
        level: 400,
        semester: 2,
        order: 1,
        subtopics: [
            makeSubtopic("Community Family Practice", "Dr. Rebecca Asamoah", 2, 3),
            makeSubtopic("Advanced Geriatric Care", "Dr. Rebecca Asamoah", 2, 3),
        ],
    },
    {
        code: "CMPC 404",
        name: "Endocrine, Reproduction and Growth",
        credits: 6,
        level: 400,
        semester: 2,
        order: 2,
        subtopics: [
            makeSubtopic("Diabetes and Metabolic Syndrome", "Prof. Rita Larbi", 2, 4),
            makeSubtopic("Thyroid and Adrenal Disorders", "Prof. Rita Larbi", 2, 4),
            makeSubtopic("Reproductive Endocrinology", "Dr. Josephine Quansah", 2, 4),
        ],
    },
    {
        code: "CMPC 406",
        name: "Mental Health",
        credits: 3,
        level: 400,
        semester: 2,
        order: 3,
        subtopics: [
            makeSubtopic("Psychiatry Clinical Rotation", "Dr. Vincent Ofosu", 2, 4),
            makeSubtopic("Substance Abuse and Addiction", "Dr. Vincent Ofosu", 2, 3),
        ],
    },
    {
        code: "CMPC 408",
        name: "Diagnostics in Healthcare II",
        credits: 2,
        level: 400,
        semester: 2,
        order: 4,
        subtopics: [
            makeSubtopic("Clinical Pathology", "Dr. Patience Nkrumah", 2, 3),
            makeSubtopic("Nuclear Medicine", "Dr. Michael Frimpong", 2, 3),
        ],
    },
    {
        code: "CMPC 410",
        name: "Lower Intermediate French 2",
        credits: 12,
        level: 400,
        semester: 2,
        order: 5,
        subtopics: [
            makeSubtopic("Advanced Medical French", "Mme. Claire Bonnet", 4, 3),
            makeSubtopic("French Clinical Communication", "Mr. Jean-Pierre Dufour", 4, 3),
        ],
    },
    {
        code: "CMPC 412",
        name: "Junior Clinical Clerkship Obstetrics & Gynaecology",
        credits: 12,
        level: 400,
        semester: 2,
        order: 6,
        subtopics: [
            makeSubtopic("Advanced Obstetrics", "Prof. Gertrude Addo", 4, 8),
            makeSubtopic("Gynaecological Surgery Observation", "Dr. Margaret Forson", 4, 6),
        ],
    },
];

// ============================
// LEVEL 500 — SEMESTER 1
// ============================
const LEVEL_500_SEM_1: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 501",
        name: "Anaesthesia and Intensive Care",
        credits: 3,
        level: 500,
        semester: 1,
        order: 1,
        subtopics: [
            makeSubtopic("General Anaesthesia", "Dr. Felix Appiah", 2, 4),
            makeSubtopic("Intensive Care Medicine", "Dr. Felix Appiah", 2, 4),
        ],
    },
    {
        code: "CMPC 503",
        name: "Electives",
        credits: 6,
        level: 500,
        semester: 1,
        order: 2,
        subtopics: [
            makeSubtopic("Elective Clinical Rotation", "Various", 4, 6),
        ],
    },
    {
        code: "CMPC 505",
        name: "Senior Clinical Clerkship in Medicine I",
        credits: 15,
        level: 500,
        semester: 1,
        order: 3,
        subtopics: [
            makeSubtopic("Internal Medicine Ward", "Prof. James Ankra", 4, 10),
            makeSubtopic("Special Clinics Rotation", "Dr. Nana Agyeman", 4, 8),
        ],
    },
    {
        code: "CMPC 507",
        name: "Senior Clinical Clerkship in Surgery I",
        credits: 15,
        level: 500,
        semester: 1,
        order: 4,
        subtopics: [
            makeSubtopic("General Surgery Ward", "Prof. Charles Baidoo", 4, 10),
            makeSubtopic("Subspecialty Surgery Rotation", "Dr. Francis Kumah", 4, 8),
        ],
    },
];

// ============================
// LEVEL 500 — SEMESTER 2
// ============================
const LEVEL_500_SEM_2: Omit<Module, "id" | "createdAt" | "updatedAt">[] = [
    {
        code: "CMPC 502",
        name: "Senior Clinical Clerkship in Medicine II",
        credits: 15,
        level: 500,
        semester: 2,
        order: 1,
        subtopics: [
            makeSubtopic("Advanced Internal Medicine", "Prof. James Ankra", 4, 10),
            makeSubtopic("Subspecialty Medicine", "Dr. Helen Opoku", 4, 8),
        ],
    },
    {
        code: "CMPC 504",
        name: "Senior Clinical Clerkship in Surgery II",
        credits: 15,
        level: 500,
        semester: 2,
        order: 2,
        subtopics: [
            makeSubtopic("Advanced Surgical Rotation", "Prof. Charles Baidoo", 4, 10),
            makeSubtopic("Trauma and Emergency Surgery", "Dr. Francis Kumah", 4, 8),
        ],
    },
    {
        code: "CMPC 506",
        name: "Entrepreneurship and Healthcare Management",
        credits: 2,
        level: 500,
        semester: 2,
        order: 3,
        subtopics: [
            makeSubtopic("Healthcare Entrepreneurship", "Dr. Samuel Tetteh", 2, 2),
            makeSubtopic("Hospital Management", "Dr. Samuel Tetteh", 2, 2),
        ],
    },
    {
        code: "CMPC 508",
        name: "Dissertation",
        credits: 3,
        level: 500,
        semester: 2,
        order: 4,
        subtopics: [
            makeSubtopic("Research Design", "Dr. Lydia Mensah", 2, 3),
            makeSubtopic("Data Analysis and Writing", "Dr. Lydia Mensah", 2, 3),
        ],
    },
];

// Combine all modules
const ALL_MODULE_DATA = [
    ...LEVEL_100_SEM_1,
    ...LEVEL_200_SEM_1,
    ...LEVEL_200_SEM_2,
    ...LEVEL_300_SEM_1,
    ...LEVEL_300_SEM_2,
    ...LEVEL_400_SEM_1,
    ...LEVEL_400_SEM_2,
    ...LEVEL_500_SEM_1,
    ...LEVEL_500_SEM_2,
];

// ============================
// Sample Timetable for CMPC 103 - Week 1
// (matches the sample document format)
// ============================
function buildSampleTimetable(modules: Module[]): ModuleTimetable[] {
    const cmpc103 = modules.find((m) => m.code === "CMPC 103");
    if (!cmpc103) return [];

    const subtopics = cmpc103.subtopics;
    const slots: TimetableSlot[] = [];

    // WEEK 1
    // Monday: PBL 7:30-9:30, SDL 9:30-10:30, LECTURE 10:30-12:30, BREAK, (BIOCHEMISTRY PRACTICAL) LECTURE 1:30-4:30
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "MONDAY", startTime: "7:30", endTime: "9:30",
        lecturerName: subtopics[0]?.lecturerName, week: 1, activityType: "PBL", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[1]?.id || "",
        day: "MONDAY", startTime: "9:30", endTime: "10:30",
        lecturerName: subtopics[1]?.lecturerName, week: 1, activityType: "SDL", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "MONDAY", startTime: "10:30", endTime: "12:30",
        lecturerName: subtopics[0]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "MONDAY", startTime: "1:30", endTime: "4:30",
        lecturerName: subtopics[3]?.lecturerName, venue: "Lab 1", week: 1, activityType: "LECTURE", colSpan: 3,
    });

    // Tuesday: LECTURE 8:30-9:30, LECTURE 10:30-12:30, BREAK, ANATOMY PRACTICAL 2:30-4:30, SPORTS 4:30-5:30
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[1]?.id || "",
        day: "TUESDAY", startTime: "8:30", endTime: "9:30",
        lecturerName: subtopics[1]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[2]?.id || "",
        day: "TUESDAY", startTime: "10:30", endTime: "12:30",
        lecturerName: subtopics[2]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "TUESDAY", startTime: "2:30", endTime: "4:30",
        lecturerName: subtopics[0]?.lecturerName, venue: "Anatomy Lab", week: 1, activityType: "ANATOMY PRACTICAL", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "TUESDAY", startTime: "4:30", endTime: "5:30",
        week: 1, activityType: "SPORTS", colSpan: 1,
    });

    // Wednesday: PBL 7:30-9:30, CLIN SKILLS PRACTICAL LECTURE 10:30-12:30, BREAK, LECTURE 2:30-3:30, SDL 4:30-5:30
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[2]?.id || "",
        day: "WEDNESDAY", startTime: "7:30", endTime: "9:30",
        lecturerName: subtopics[2]?.lecturerName, week: 1, activityType: "PBL", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[1]?.id || "",
        day: "WEDNESDAY", startTime: "10:30", endTime: "12:30",
        lecturerName: subtopics[1]?.lecturerName, venue: "Skills Lab", week: 1, activityType: "CLIN SKILLS", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "WEDNESDAY", startTime: "2:30", endTime: "3:30",
        lecturerName: subtopics[0]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "WEDNESDAY", startTime: "4:30", endTime: "5:30",
        week: 1, activityType: "SDL", colSpan: 1,
    });

    // Thursday: LECTURE 7:30-9:30, LECTURE 10:30-12:30, BREAK, LECTURE 2:30-3:30, SDL 3:30-4:30, SDL 4:30-5:30
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[2]?.id || "",
        day: "THURSDAY", startTime: "7:30", endTime: "9:30",
        lecturerName: subtopics[2]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "THURSDAY", startTime: "10:30", endTime: "12:30",
        lecturerName: subtopics[0]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[1]?.id || "",
        day: "THURSDAY", startTime: "2:30", endTime: "3:30",
        lecturerName: subtopics[1]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "THURSDAY", startTime: "3:30", endTime: "4:30",
        week: 1, activityType: "SDL", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "THURSDAY", startTime: "4:30", endTime: "5:30",
        week: 1, activityType: "SDL", colSpan: 1,
    });

    // Friday: PBL 7:30-9:30, LECTURE 10:30-12:30, BREAK, TUTORIAL 2:30-3:30, SDL 3:30-4:30, SDL 4:30-5:30
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[0]?.id || "",
        day: "FRIDAY", startTime: "7:30", endTime: "9:30",
        lecturerName: subtopics[0]?.lecturerName, week: 1, activityType: "PBL", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[2]?.id || "",
        day: "FRIDAY", startTime: "10:30", endTime: "12:30",
        lecturerName: subtopics[2]?.lecturerName, week: 1, activityType: "LECTURE", colSpan: 2,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[1]?.id || "",
        day: "FRIDAY", startTime: "2:30", endTime: "3:30",
        lecturerName: subtopics[1]?.lecturerName, week: 1, activityType: "TUTORIAL", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "FRIDAY", startTime: "3:30", endTime: "4:30",
        week: 1, activityType: "SDL", colSpan: 1,
    });
    slots.push({
        id: genId(), moduleId: cmpc103.id, subtopicId: subtopics[3]?.id || "",
        day: "FRIDAY", startTime: "4:30", endTime: "5:30",
        week: 1, activityType: "SDL", colSpan: 1,
    });

    const timetable: ModuleTimetable = {
        id: genId(),
        moduleId: cmpc103.id,
        level: 100,
        semester: 1,
        academicYear: "2024/2025",
        totalWeeks: 8,
        startDate: "2025-02-03",
        endDate: "2025-03-28",
        slots,
    };

    return [timetable];
}

// ============================
// Seed function
// ============================
const SEED_VERSION_KEY = "college_modules_seed_version";
const CURRENT_SEED_VERSION = "2"; // Bump this to force reseed

export function seedModulesData(forceReseed = false): void {
    const seedVersion = localStorage.getItem(SEED_VERSION_KEY);

    if (!forceReseed && seedVersion === CURRENT_SEED_VERSION) {
        // Check if data actually exists
        const existingModules = localStorage.getItem(MODULES_STORAGE_KEY);
        if (existingModules) {
            try {
                const parsed = JSON.parse(existingModules);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.code) {
                    return; // Valid data exists
                }
            } catch {
                // Invalid data, reseed
            }
        }
    }

    console.log("[ModulesSeed] Seeding modules and timetable data...");

    // Reset counter for consistent IDs
    idCounter = 1;

    // Build modules with IDs
    const modules: Module[] = ALL_MODULE_DATA.map((m) => ({
        ...m,
        id: genId(),
        createdAt: now,
        updatedAt: now,
    }));

    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));

    // Build sample timetable for CMPC 103
    const timetables = buildSampleTimetable(modules);
    localStorage.setItem(TIMETABLES_STORAGE_KEY, JSON.stringify(timetables));

    // Mark seed version
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);

    console.log(
        `[ModulesSeed] Seeded ${modules.length} modules and ${timetables.length} timetable(s).`
    );
}

