import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  // Create ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });
  console.log({ adminRole });

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  let adminUser = await prisma.user.findFirst({
    where: { email: "admin@admin.com" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: "admin@admin.com",
        name: "Super Admin",
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });
  }
  console.log({ adminUser });

  // ── Seed About ──
  const aboutExists = await prisma.about.findFirst();
  if (!aboutExists) {
    await prisma.about.create({
      data: {
        email: "taufaniafrinda21@gmail.com",
        location: "Jakarta, Indonesia",
        content: `<p>I am an Architecture graduate with professional experience as an Interior Designer, as well as previous internships and freelance projects. My work covers site measurement, design concept development, 3D visualization, and technical drawings for residential renovations and exhibition booths.</p><p>I am proficient in design software, adaptable, and collaborative, with strong skills in planning, supervision, and quality control. I am seeking opportunities as an Interior Designer or Junior Architect to further grow, develop my skills, and contribute to innovative projects.</p><p>Please feel free to contact me via email or direct message if there are any job opportunities that match my qualifications.</p>`,
      },
    });
    console.log("About seeded.");
  }

  // ── Seed Skills ──
  const allSkillNames = [
    "Space Planning",
    "3D Modeling",
    "Interior Design",
    "Technical Drawing",
    "AutoCAD",
    "SketchUp",
    "D5 Render",
    "Microsoft Office",
    "Quality Control",
    "Construction",
    "RAB Calculation",
  ];

  const skillMap: Record<string, string> = {};
  for (const name of allSkillNames) {
    const skill = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    skillMap[name] = skill.id;
  }
  console.log(`Seeded ${allSkillNames.length} skills.`);

  // ── Seed Experiences ──
  const experienceCount = await prisma.experience.count();
  if (experienceCount === 0) {
    const experiences = [
      {
        order: 1,
        company: "Saturuma Interior Design & Build",
        role: "Interior Designer",
        type: "Kontrak",
        startDate: "2026-02",
        endDate: null,
        location: "Jakarta Timur, Jakarta Raya, Indonesia · Di lokasi",
        skillNames: ["Space Planning", "3D Modeling", "Interior Design"],
        description: [],
        isActive: true,
      },
      {
        order: 2,
        company: "West Interior",
        role: "Interior Designer",
        type: "Purnawaktu",
        startDate: "2025-05",
        endDate: "2026-02",
        location: "Surabaya, Jawa Timur, Indonesia · Di lokasi",
        skillNames: ["Interior Design", "Space Planning", "3D Modeling", "Technical Drawing", "AutoCAD"],
        description: [],
        isActive: true,
      },
      {
        order: 3,
        company: "Pekerja Lepas",
        role: "Freelance Architect & Interior Designer",
        type: "Pekerja Lepas",
        startDate: "2025-01",
        endDate: "2026-02",
        location: "Jarak Jauh",
        skillNames: ["3D Modeling", "Technical Drawing", "AutoCAD", "SketchUp", "D5 Render"],
        description: [
          "Residential: Collaborated with a contractor to produce 2D construction drawings for a house renovation. Responsibilities included on-site measurement of existing conditions and creating detailed technical drawings.",
          "Workplace: Redesigned a meeting room to improve spatial efficiency and comfort — measured the existing space, developed multiple 3D proposals, and provided furniture recommendations tailored to the client's needs.",
        ],
        isActive: true,
      },
      {
        order: 4,
        company: "Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)",
        role: "Project Supervisor Assistant",
        type: "Magang",
        startDate: "2022-08",
        endDate: "2022-12",
        location: "Kecamatan Serang, Banten, Indonesia · Di lokasi",
        skillNames: ["SketchUp", "Microsoft Office", "Quality Control", "3D Modeling", "AutoCAD"],
        description: [
          "Performed data input for TKDN calculation on the construction work package of the architectural work section, and checked the materials on the Domestic Production Goods/Services Inventory List.",
          "Performed quality inspections for 64 room units in the Tanjung Lesung workers' apartment project, ensuring compliance with construction standards and project schedules.",
          "Monitored weekly progress on construction of the Kemenkumham Poltekip and Poltekim dormitory flats project.",
          "Contributed to the 3D garden design and architectural design process of the Poltekip and Poltekim Kemenkumham dormitory flats project.",
        ],
        isActive: true,
      },
      {
        order: 5,
        company: "PT. Surya Andalan Bumi Persada",
        role: "Field Supervisor",
        type: "Magang",
        startDate: "2022-04",
        endDate: "2022-06",
        location: "Surabaya, Jawa Timur, Indonesia · Di lokasi",
        skillNames: ["Microsoft Office", "Construction", "RAB Calculation"],
        description: [
          "Monitored the weekly progress of the construction project of a 2-storey residential house in the Puri Galaxy Surabaya housing complex.",
          "Performed RAB calculations on architectural work in the Construction of a 2-floor residential house in Puri Galaxy Surabaya.",
        ],
        isActive: true,
      },
    ];

    for (const { skillNames, ...expData } of experiences) {
      await prisma.experience.create({
        data: {
          ...expData,
          skills: {
            connect: skillNames.map((name) => ({ id: skillMap[name]! })),
          },
        },
      });
    }
    console.log(`Seeded ${experiences.length} experiences.`);
  }

  // ── Seed Backup Configs ──
  const tidbConfig = await prisma.backupConfig.findFirst({
    where: { name: "TiDB Cloud Production" },
  });

  if (!tidbConfig) {
    await prisma.backupConfig.create({
      data: {
        name: "TiDB Cloud Production",
        databaseType: "TIDB",
        host: process.env.NEXT_PUBLIC_TIDB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
        port: parseInt(process.env.NEXT_PUBLIC_TIDB_PORT || "3306"),
        databaseName: process.env.NEXT_PUBLIC_TIDB_DB || "frindasp",
        username: process.env.NEXT_PUBLIC_TIDB_USER || "2puzcssyZR699bw.root",
        password: process.env.NEXT_PUBLIC_TIDB_PASS || "ghAYdJJAIg3bzcYg",
        options: {
          ssl: {
            minVersion: "TLSv1.2",
            rejectUnauthorized: true
          }
        }
      }
    });
    console.log("Seeded default TiDB Cloud backup config.");
  }
}





main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
