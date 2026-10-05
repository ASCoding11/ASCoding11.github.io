/* Prompted school library: supplemental essays for the 2026–27 application cycle (fall 2027 entry).
 *
 * Schools: the top 50 of the U.S. News 2027 Best National Universities list (51 schools, with a tie at 49).
 * Prompts are SHORT SUMMARIES in our own words, not the official wording. Students paste the exact
 * prompt from the application; the editor reminds them to. Limits, plans and deadlines are what each
 * school published for 2026–27 as of the date below; schools sometimes change them, so the app links
 * to every admissions site and says to confirm.
 *
 * Main sources: College Essay Advisors' 2026–27 supplemental essay guides (per school), College
 * Transitions, College Essay Guy, the schools' own admissions pages and news releases (UNC, Georgia
 * Tech), and KD College Prep's 2026–27 deadline list.
 *
 * Format
 *   plans:    [plan, 'YYYY-MM-DD'] in the order a student would see them
 *   colleges: undergraduate schools/colleges or programs with their own prompts. f = intended-major
 *             fields that point to that college by default ('*' = any). Prompts with c only appear for
 *             students applying to that college.
 *   groups:   id: [how many to answer, label]. Prompts with g belong to a "choose N" set.
 *   prompts:  [summary, limit, unit ('w' words | 'c' characters), kind, extras]
 *             kind: why | major | community | activity | curiosity | challenge | short | other
 *             extras: { c: college id, g: group id, opt: 1 (optional) }
 *   shared:   'uc' — University of California campuses share one application and one set of
 *             Personal Insight Questions, so they're added as a single school.
 */
window.PR_LIB = {
  cycle: '2026–27',
  updated: '2026-10-05',
  ranking: 'U.S. News 2027 Best National Universities',
  fields: [
    ['eng', 'Engineering'],
    ['cs', 'Computer science'],
    ['sci', 'Natural sciences & math'],
    ['health', 'Pre-med & health sciences'],
    ['nurs', 'Nursing'],
    ['bus', 'Business & finance'],
    ['soc', 'Social sciences (econ, psych, poli sci…)'],
    ['hum', 'Humanities (English, history, languages…)'],
    ['policy', 'Public policy & international affairs'],
    ['art', 'Art, design & performing arts'],
    ['arch', 'Architecture'],
    ['und', 'Undecided']
  ],
  schools: [
    { id: 'mit', rank: 1, name: 'MIT', full: 'Massachusetts Institute of Technology', app: 'MIT application', url: 'https://mitadmissions.org/apply/',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-04']],
      prompts: [
        ['The field of study you are drawn to right now, and what sparked that interest', 100, 'w', 'major'],
        ['A time you learned in a way that went beyond the usual path', 225, 'w', 'curiosity'],
        ['Problems you hope to work on and how MIT would help you make a difference', 225, 'w', 'why'],
        ['An unexpected challenge you handled, and what it taught you', 225, 'w', 'challenge'],
        ['Something you do just because you enjoy it', 50, 'w', 'short'],
        ['Someone you admire, and why', 50, 'w', 'short'],
        ['A topic you could talk about for hours', 50, 'w', 'short'],
        ['Are you more of a generalist or a specialist? Back it up', 50, 'w', 'short'],
        ['Circumstances or context the rest of the application leaves out', 0, 'w', 'other', { opt: 1 }]
      ] },

    { id: 'princeton', rank: 2, name: 'Princeton', full: 'Princeton University', app: 'Common App', url: 'https://admission.princeton.edu/apply',
      plans: [['REA / SCEA', '2026-11-01'], ['RD', '2027-01-01']],
      colleges: [
        { id: 'bse', name: 'B.S.E. (engineering)', f: ['eng', 'cs'] },
        { id: 'ab', name: 'A.B. or undecided', f: ['*'] }
      ],
      prompts: [
        ['Engineering interests and experiences, and why Princeton Engineering fits you', 250, 'w', 'major', { c: 'bse' }],
        ['Academic areas that excite you and how Princeton’s liberal arts programs fit them', 250, 'w', 'major', { c: 'ab' }],
        ['How your lived experiences would shape conversations, and what classmates would learn from you', 500, 'w', 'community'],
        ['How your story connects to Princeton’s commitment to service', 250, 'w', 'community'],
        ['A skill you want to learn in college', 50, 'w', 'short'],
        ['What brings you joy', 50, 'w', 'short'],
        ['The song that is the soundtrack of your life right now', 50, 'w', 'short']
      ] },

    { id: 'harvard', rank: 3, name: 'Harvard', full: 'Harvard University', app: 'Common App', url: 'https://college.harvard.edu/admissions/apply',
      plans: [['REA / SCEA', '2026-11-01'], ['RD', '2027-01-01']],
      prompts: [
        ['How your life experiences would help you contribute to Harvard', 150, 'w', 'community'],
        ['A time you disagreed with someone about an idea: how you engaged and what you learned', 150, 'w', 'challenge'],
        ['Activities, jobs, travel or family responsibilities that shaped who you are', 150, 'w', 'activity'],
        ['How you hope to use your Harvard education in the future', 150, 'w', 'other'],
        ['Three things your future roommates should know about you', 150, 'w', 'other']
      ] },

    { id: 'yale', rank: 4, name: 'Yale', full: 'Yale University', app: 'Common App', url: 'https://admissions.yale.edu/apply',
      plans: [['REA / SCEA', '2026-11-01'], ['RD', '2027-01-02']],
      groups: { g1: [1, 'Choose 1 of 3'] },
      prompts: [
        ['Pick up to three academic areas that interest you', 0, 'w', 'short'],
        ['A topic or idea in those areas that excites you, and why', 200, 'w', 'curiosity'],
        ['A course, book or work of art you would create to share with others', 200, 'c', 'short'],
        ['A quality or value you hope to grow into during college', 200, 'c', 'short'],
        ['Something about you that isn’t anywhere else in your application', 200, 'c', 'short'],
        ['A conversation about an important issue with someone who saw it differently', 400, 'w', 'challenge', { g: 'g1' }],
        ['A community you belong to and why it matters to you', 400, 'w', 'community', { g: 'g1' }],
        ['A personal experience that shapes what you would bring to Yale', 400, 'w', 'community', { g: 'g1' }]
      ] },

    { id: 'caltech', rank: 5, name: 'Caltech', full: 'California Institute of Technology', app: 'Common App', url: 'https://www.admissions.caltech.edu/apply',
      plans: [['REA / SCEA', '2026-11-01'], ['RD', '2027-01-04']],
      groups: { g1: [1, 'Choose 1 of 2'], g2: [2, 'Choose 2 of 4'] },
      prompts: [
        ['Choose one or two STEM areas you want to study', 0, 'w', 'short'],
        ['Why those STEM areas, with an example from your life', 200, 'w', 'major'],
        ['A STEM topic you have gone down a rabbit hole on recently', 150, 'w', 'curiosity'],
        ['How your interest in science began and how it has grown', 200, 'w', 'major', { g: 'g1' }],
        ['A meaningful STEM experience and the curiosity it sparked', 200, 'w', 'curiosity', { g: 'g1' }],
        ['Ways you have been creative or inventive in everyday life', 200, 'w', 'other'],
        ['A hobby that brings you joy (250 words across both answers)', 125, 'w', 'other', { g: 'g2' }],
        ['A class you would teach, and why (250 words across both answers)', 125, 'w', 'other', { g: 'g2' }],
        ['Part of your identity that shapes how you see the world (250 words across both answers)', 125, 'w', 'community', { g: 'g2' }],
        ['An idea that blew your mind when you first met it (250 words across both answers)', 125, 'w', 'curiosity', { g: 'g2' }],
        ['Circumstances that disrupted your schooling or limited your course choices', 0, 'w', 'other', { opt: 1 }]
      ] },

    { id: 'stanford', rank: 5, name: 'Stanford', full: 'Stanford University', app: 'Common App', url: 'https://admission.stanford.edu/apply/',
      plans: [['REA / SCEA', '2026-11-01'], ['RD', '2027-01-05']],
      prompts: [
        ['An idea or experience that makes you genuinely excited about learning', 250, 'w', 'curiosity'],
        ['A note to your future roommate that tells them something real about you', 250, 'w', 'other'],
        ['What your experiences, interests and character would add to Stanford', 250, 'w', 'community'],
        ['The most significant challenge society faces today', 50, 'w', 'short'],
        ['How you spent your last two summers', 50, 'w', 'short'],
        ['A historical moment you wish you had witnessed', 50, 'w', 'short'],
        ['More about one activity, job or family responsibility', 50, 'w', 'short'],
        ['Five things that are important to you', 50, 'w', 'short']
      ] },

    { id: 'penn', rank: 7, name: 'Penn', full: 'University of Pennsylvania', app: 'Common App', url: 'https://admissions.upenn.edu/how-to-apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-05']],
      colleges: [
        { id: 'seas', name: 'Penn Engineering', f: ['eng', 'cs'] },
        { id: 'wharton', name: 'Wharton', f: ['bus'] },
        { id: 'nursing', name: 'School of Nursing', f: ['nurs'] },
        { id: 'cas', name: 'College of Arts & Sciences', f: ['*'] }
      ],
      prompts: [
        ['A thank-you note to someone you have not properly thanked', 200, 'w', 'other'],
        ['How you will engage with Penn’s community, and how it will shape you', 200, 'w', 'community'],
        ['Your engineering interests and how Penn Engineering supports your intended major', 200, 'w', 'major', { c: 'seas' }],
        ['An issue you care about and how a Wharton education would help you address it', 200, 'w', 'major', { c: 'wharton' }],
        ['Why Nursing, your career goals, and how you would advance health equity', 200, 'w', 'major', { c: 'nursing' }],
        ['Something you are curious about and how you would explore it in the College', 200, 'w', 'major', { c: 'cas' }]
      ] },

    { id: 'duke', rank: 8, name: 'Duke', full: 'Duke University', app: 'Common App', url: 'https://admissions.duke.edu/apply/',
      plans: [['ED', '2026-11-02'], ['RD', '2027-01-04']],
      groups: { o1: [1, 'Optional: up to 1 of 3'] },
      prompts: [
        ['Why Duke, and how it fits your academic and personal goals', 250, 'w', 'why'],
        ['A community that shaped you and what you would bring from it to Duke', 250, 'w', 'community'],
        ['Perspectives or lived experiences that show who you are', 250, 'w', 'community', { g: 'o1', opt: 1 }],
        ['A respectful disagreement with someone you care about', 250, 'w', 'challenge', { g: 'o1', opt: 1 }],
        ['Something you have been genuinely excited about lately', 250, 'w', 'curiosity', { g: 'o1', opt: 1 }]
      ] },

    { id: 'jhu', rank: 9, name: 'Johns Hopkins', full: 'Johns Hopkins University', app: 'Common App', url: 'https://apply.jhu.edu/',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-02'], ['RD', '2027-01-02']],
      prompts: [
        ['How engaging with people unlike you has shaped the way you build community and collaborate', 350, 'w', 'community']
      ] },

    { id: 'northwestern', rank: 9, name: 'Northwestern', full: 'Northwestern University', app: 'Common App', url: 'https://admissions.northwestern.edu/apply/',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-02']],
      groups: { o1: [2, 'Optional: pick 1–2'] },
      prompts: [
        ['How your background shapes the way you would engage with Northwestern’s community', 300, 'w', 'community'],
        ['The message you would paint on The Rock, and why', 200, 'w', 'other', { g: 'o1', opt: 1 }],
        ['A class, research project or creative venture you would lead, and who you would bring in', 200, 'w', 'curiosity', { g: 'o1', opt: 1 }],
        ['Communities or student groups where you see yourself at Northwestern', 200, 'w', 'why', { g: 'o1', opt: 1 }],
        ['What draws you to Evanston and Chicago', 200, 'w', 'why', { g: 'o1', opt: 1 }],
        ['How your background would add to the range of perspectives on campus', 200, 'w', 'community', { g: 'o1', opt: 1 }]
      ] },

    { id: 'uchicago', rank: 9, name: 'UChicago', full: 'University of Chicago', app: 'Common App', url: 'https://collegeadmissions.uchicago.edu/apply',
      plans: [['EA', '2026-11-03'], ['ED', '2026-11-03'], ['ED II', '2027-01-05'], ['RD', '2027-01-05']],
      groups: { g1: [1, 'Choose 1 of 5'] },
      note: 'No word limits. Aim for about one to two pages each.',
      prompts: [
        ['How UChicago’s learning, community and future opportunities fit your goals (about 1–2 pages)', 0, 'w', 'why'],
        ['How do thoughts eat? What do they need, and how do they grow?', 0, 'w', 'curiosity', { g: 'g1' }],
        ['Use the principles of an art form to solve a real problem', 0, 'w', 'curiosity', { g: 'g1' }],
        ['Invent a mixed metaphor, explain it, and put it to use', 0, 'w', 'curiosity', { g: 'g1' }],
        ['Turn an everyday activity into an Olympic event, with scoring and a case for it', 0, 'w', 'curiosity', { g: 'g1' }],
        ['Answer a past UChicago prompt or write your own question', 0, 'w', 'curiosity', { g: 'g1' }]
      ] },

    { id: 'columbia', rank: 12, name: 'Columbia', full: 'Columbia University', app: 'Common App', url: 'https://undergrad.admissions.columbia.edu/apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-02']],
      prompts: [
        ['A list of books and other resources outside class that shaped your thinking', 100, 'w', 'curiosity'],
        ['Something central to your life and how it would shape how you learn and collaborate at Columbia', 150, 'w', 'community'],
        ['A disagreement and what you learned from engaging respectfully', 150, 'w', 'challenge'],
        ['A challenge you faced and how you changed because of it', 150, 'w', 'challenge'],
        ['Why Columbia', 150, 'w', 'why'],
        ['What draws you to your intended field of study at Columbia College or Columbia Engineering', 150, 'w', 'major']
      ] },

    { id: 'dartmouth', rank: 12, name: 'Dartmouth', full: 'Dartmouth College', app: 'Common App', url: 'https://admissions.dartmouth.edu/apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-01']],
      groups: { g1: [1, 'Choose 1 of 2'], g2: [1, 'Choose 1 of 6'] },
      prompts: [
        ['Why Dartmouth: the academics, community and setting that appeal to you', 100, 'w', 'why'],
        ['Where you grew up and how it shaped who you are', 250, 'w', 'community', { g: 'g1' }],
        ['Introduce yourself in your own way', 250, 'w', 'other', { g: 'g1' }],
        ['A subject or idea that sparks your curiosity', 250, 'w', 'curiosity', { g: 'g2' }],
        ['How you are making, or hope to make, a positive impact', 250, 'w', 'community', { g: 'g2' }],
        ['A book that changed how you see yourself or others', 250, 'w', 'curiosity', { g: 'g2' }],
        ['Finding common ground with someone who disagreed with you', 250, 'w', 'challenge', { g: 'g2' }],
        ['An intellectual passion and why it satisfies you', 250, 'w', 'curiosity', { g: 'g2' }],
        ['What makes you different and how you have embraced it', 250, 'w', 'community', { g: 'g2' }]
      ] },

    { id: 'cmu', rank: 14, name: 'Carnegie Mellon', full: 'Carnegie Mellon University', app: 'Common App', url: 'https://www.cmu.edu/admission/apply',
      plans: [['ED', '2026-11-02'], ['RD', '2027-01-04']],
      note: 'Some programs (drama, music, art, architecture, design) also need a portfolio or audition.',
      prompts: [
        ['What inspired you to choose your intended major or area of study', 300, 'w', 'major'],
        ['How you will define a successful college experience', 300, 'w', 'other'],
        ['Anything you want to emphasize that isn’t elsewhere in your application', 300, 'w', 'other']
      ] },

    { id: 'cornell', rank: 14, name: 'Cornell', full: 'Cornell University', app: 'Common App', url: 'https://admissions.cornell.edu/apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-02']],
      note: 'No university-wide essay this year. Each college has its own.',
      colleges: [
        { id: 'eng', name: 'Duffield College of Engineering', f: ['eng', 'cs'] },
        { id: 'as', name: 'College of Arts & Sciences', f: ['sci', 'soc', 'hum', 'und', 'cs'] },
        { id: 'cals', name: 'Agriculture & Life Sciences (CALS)', f: ['sci', 'health'] },
        { id: 'aap', name: 'Architecture, Art & Planning (AAP)', f: ['arch', 'art'] },
        { id: 'brooks', name: 'Brooks School of Public Policy', f: ['policy'] },
        { id: 'biz', name: 'SC Johnson College of Business (Dyson / Nolan)', f: ['bus'] },
        { id: 'che', name: 'College of Human Ecology', f: ['health'] },
        { id: 'ilr', name: 'ILR School', f: [] }
      ],
      prompts: [
        ['Why engineering: what draws you to it', 200, 'w', 'major', { c: 'eng' }],
        ['Why Cornell Engineering specifically', 200, 'w', 'why', { c: 'eng' }],
        ['Something that brings you joy', 100, 'w', 'short', { c: 'eng' }],
        ['A perspective you would bring to Cornell Engineering', 100, 'w', 'community', { c: 'eng' }],
        ['One meaningful activity, responsibility or passion', 100, 'w', 'activity', { c: 'eng' }],
        ['An award or achievement that matters to you, and why', 100, 'w', 'activity', { c: 'eng' }],
        ['Three words that describe you (30 characters each)', 90, 'c', 'short', { c: 'eng' }],
        ['Three words that describe Cornell Engineering (30 characters each)', 90, 'c', 'short', { c: 'eng' }],
        ['An intellectual interest and how the Arts & Sciences curriculum would let you pursue it', 650, 'w', 'major', { c: 'as' }],
        ['What draws you to your CALS major, through your experiences and goals', 350, 'w', 'major', { c: 'cals' }],
        ['Why CALS: its community and opportunities', 350, 'w', 'why', { c: 'cals' }],
        ['How your interests connect to your AAP major (architecture applicants: your creative work)', 650, 'w', 'major', { c: 'aap' }],
        ['Why public policy, through your experiences and values', 650, 'w', 'major', { c: 'brooks' }],
        ['Issues you care about and how the business school you’re applying to fits them', 650, 'w', 'major', { c: 'biz' }],
        ['An experience that connects to Human Ecology’s mission and your intended major', 550, 'w', 'major', { c: 'che' }],
        ['Issues you care about and how they fit the ILR School’s focus', 650, 'w', 'major', { c: 'ilr' }]
      ] },

    { id: 'vanderbilt', rank: 16, name: 'Vanderbilt', full: 'Vanderbilt University', app: 'Common App', url: 'https://admissions.vanderbilt.edu/apply/',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-01'], ['RD', '2027-01-01']],
      prompts: [
        ['How your identity, culture or background helped you grow, and what you would bring to Vanderbilt', 250, 'w', 'community']
      ] },

    { id: 'brown', rank: 16, name: 'Brown', full: 'Brown University', app: 'Common App', url: 'https://admission.brown.edu/apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-05']],
      colleges: [
        { id: 'std', name: 'Brown (A.B. / Sc.B.)', f: ['*'] },
        { id: 'plme', name: 'Program in Liberal Medical Education (PLME)', f: [] }
      ],
      prompts: [
        ['How you would use the Open Curriculum, and what you would bring to it', 250, 'w', 'why'],
        ['How your background or upbringing inspires you, and what you would add to campus', 250, 'w', 'community'],
        ['Something that brings you joy', 150, 'w', 'other'],
        ['A class you would teach', 150, 'w', 'other'],
        ['An experience that drew you to medicine', 250, 'w', 'major', { c: 'plme' }],
        ['Why PLME specifically', 250, 'w', 'why', { c: 'plme' }],
        ['A quality outside medicine that will make you a good doctor', 250, 'w', 'other', { c: 'plme' }]
      ] },

    { id: 'rice', rank: 16, name: 'Rice', full: 'Rice University', app: 'Common App', url: 'https://admission.rice.edu/apply',
      plans: [['ED', '2026-11-01'], ['RD', '2027-01-04']],
      groups: { g1: [1, 'Choose 1 of 2'] },
      prompts: [
        ['Your academic areas of interest and how you would explore them at Rice', 150, 'w', 'major'],
        ['What about the Rice experience excites you', 150, 'w', 'why'],
        ['Perspectives and experiences you would bring to your residential college', 500, 'w', 'community', { g: 'g1' }],
        ['How your background and identity would help you drive change at Rice', 500, 'w', 'community', { g: 'g1' }],
        ['The Rice Box: upload an image of something meaningful to you', 0, 'w', 'other']
      ] },

    { id: 'washu', rank: 16, name: 'WashU', full: 'Washington University in St. Louis', app: 'Common App', url: 'https://admissions.wustl.edu/apply/',
      plans: [['EA', '2026-11-02'], ['ED', '2026-11-02'], ['ED II', '2027-01-04'], ['RD', '2027-01-04']],
      prompts: [
        ['Your intended field of study and why you want to pursue it at WashU', 250, 'w', 'major']
      ] },

    { id: 'ucb', rank: 20, name: 'UC Berkeley', full: 'University of California, Berkeley', shared: 'uc' },
    { id: 'ucla', rank: 20, name: 'UCLA', full: 'University of California, Los Angeles', shared: 'uc' },

    { id: 'notredame', rank: 20, name: 'Notre Dame', full: 'University of Notre Dame', app: 'Common App', url: 'https://admissions.nd.edu/apply/',
      plans: [['REA / SCEA', '2026-11-02'], ['RD', '2027-01-04']],
      groups: { g1: [2, 'Choose 2 of 4'] },
      prompts: [
        ['What draws you to your intended field and how Notre Dame would help you grow in it', 100, 'w', 'major'],
        ['Your non-negotiables in choosing a college and how Notre Dame meets them', 150, 'w', 'why'],
        ['How your faith or beliefs guide your decisions', 100, 'w', 'community', { g: 'g1' }],
        ['Something about your background and how it shaped you', 100, 'w', 'community', { g: 'g1' }],
        ['How you show care for others in your community', 100, 'w', 'community', { g: 'g1' }],
        ['What you would fight for', 100, 'w', 'other', { g: 'g1' }]
      ] },

    { id: 'emory', rank: 23, name: 'Emory', full: 'Emory University', app: 'Common App', url: 'https://apply.emory.edu/apply/',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-01'], ['RD', '2027-01-01']],
      groups: { g1: [1, 'Choose 1 of 4'] },
      prompts: [
        ['Your intended area of study and why it interests you', 200, 'w', 'major'],
        ['A community you belong to and how you changed it', 150, 'w', 'community', { g: 'g1' }],
        ['A time you set out to understand a culture different from your own', 150, 'w', 'community', { g: 'g1' }],
        ['How you would contribute to Emory’s mission of serving humanity', 150, 'w', 'why', { g: 'g1' }],
        ['How you handle disagreement in a way that keeps the conversation going', 150, 'w', 'challenge', { g: 'g1' }]
      ] },

    { id: 'georgetown', rank: 23, name: 'Georgetown', full: 'Georgetown University', app: 'Georgetown application', url: 'https://uadmissions.georgetown.edu/applying/',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-01']],
      note: 'Georgetown uses its own application, not the Common App. Limits here are approximate: about half a page and about a page.',
      colleges: [
        { id: 'college', name: 'Georgetown College', f: ['*'] },
        { id: 'sfs', name: 'Walsh School of Foreign Service', f: ['policy'] },
        { id: 'msb', name: 'McDonough School of Business', f: ['bus'] },
        { id: 'nursing', name: 'Berkley School of Nursing', f: ['nurs'] },
        { id: 'health', name: 'School of Health', f: ['health'] },
        { id: 'mccourt', name: 'McCourt School of Public Policy', f: [] },
        { id: 'env', name: 'Environment & Sustainability (Earth Commons)', f: [] }
      ],
      prompts: [
        ['Your most meaningful school or summer activity and why it matters (about half a page)', 250, 'w', 'activity'],
        ['Engaging with someone who sees things differently, and what you learned (about half a page)', 250, 'w', 'challenge'],
        ['A personal essay about your background, experiences and talents (about one page)', 500, 'w', 'other'],
        ['Why study in Georgetown College, and your intended major if you have one (about one page)', 500, 'w', 'why', { c: 'college' }],
        ['Why international affairs, and how you hope to serve globally (about one page)', 500, 'w', 'why', { c: 'sfs' }],
        ['Why study business at Georgetown (about one page)', 500, 'w', 'why', { c: 'msb' }],
        ['What draws you to nursing at Georgetown (about one page)', 500, 'w', 'why', { c: 'nursing' }],
        ['What draws you to health studies and your intended major (about one page)', 500, 'w', 'why', { c: 'health' }],
        ['Why public policy, and how you hope to serve (about one page)', 500, 'w', 'why', { c: 'mccourt' }],
        ['Why environment and sustainability, and the change you want to make (about one page)', 500, 'w', 'why', { c: 'env' }]
      ] },

    { id: 'michigan', rank: 25, name: 'Michigan', full: 'University of Michigan', app: 'Common App', url: 'https://admissions.umich.edu/apply',
      plans: [['ED', '2026-11-01'], ['EA', '2026-11-01'], ['RD', '2027-02-01']],
      colleges: [
        { id: 'eng', name: 'College of Engineering', f: ['eng', 'cs'] },
        { id: 'ross', name: 'Ross School of Business', f: ['bus'] },
        { id: 'nursing', name: 'School of Nursing', f: ['nurs'] },
        { id: 'lsa', name: 'LSA (Literature, Science & the Arts)', f: ['*'] },
        { id: 'other', name: 'Another school or college', f: ['art', 'arch'] }
      ],
      prompts: [
        ['How your background and goals would make you a leader in Michigan’s community (100 word minimum)', 300, 'w', 'community'],
        ['Why the specific Michigan school or college you’re applying to, and how its curriculum fits you (100 word minimum)', 500, 'w', 'why'],
        ['Ross: a local issue, its business side, and a solution using business thinking', 500, 'w', 'major', { c: 'ross' }],
        ['Ross: an artifact from high school that shows your learning, with a description', 250, 'w', 'other', { c: 'ross' }]
      ] },

    { id: 'uva', rank: 26, name: 'UVA', full: 'University of Virginia', app: 'Common App', url: 'https://admission.virginia.edu/apply',
      plans: [['ED', '2026-11-01'], ['EA', '2026-11-01'], ['RD', '2027-01-05']],
      note: 'No general supplemental essay this year. Only School of Nursing applicants write one.',
      colleges: [
        { id: 'std', name: 'Any school except Nursing', f: ['*'] },
        { id: 'nursing', name: 'School of Nursing', f: ['nurs'] }
      ],
      prompts: [
        ['An experience in health care or with a patient that strengthened your interest in nursing', 250, 'w', 'major', { c: 'nursing' }]
      ] },

    { id: 'unc', rank: 27, name: 'UNC', full: 'University of North Carolina at Chapel Hill', app: 'Common App', url: 'https://admissions.unc.edu/apply/',
      plans: [['EA', '2026-10-15'], ['RD', '2027-01-15']],
      note: 'UNC dropped its supplemental essays for 2026–27. Only the Common App personal essay is required.',
      prompts: [] },

    { id: 'usc', rank: 27, name: 'USC', full: 'University of Southern California', app: 'Common App', url: 'https://admission.usc.edu/apply/',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-10']],
      note: 'Some majors (cinematic arts, architecture, music, dance, theatre) have extra requirements and earlier deadlines.',
      prompts: [
        ['How you plan to pursue your academic interests and intended major at USC', 250, 'w', 'major'],
        ['A disagreement with someone important to you and what you learned', 250, 'w', 'challenge', { opt: 1 }],
        ['Describe yourself in three words', 25, 'c', 'short'],
        ['Your favorite snack', 100, 'c', 'short'],
        ['The best movie of all time', 100, 'c', 'short'],
        ['Your dream job', 100, 'c', 'short'],
        ['Your theme song', 100, 'c', 'short'],
        ['Your dream trip', 100, 'c', 'short'],
        ['The show you will binge next', 100, 'c', 'short'],
        ['Your ideal roommate, real or fictional', 100, 'c', 'short'],
        ['Your favorite book', 100, 'c', 'short'],
        ['A class you would teach', 100, 'c', 'short']
      ] },

    { id: 'gatech', rank: 29, name: 'Georgia Tech', full: 'Georgia Institute of Technology', app: 'Common App', url: 'https://admission.gatech.edu/apply/',
      plans: [['EA', '2026-10-15'], ['EA II', '2026-11-02'], ['RD', '2027-01-01']],
      note: 'Georgia Tech dropped its supplemental essay for 2026–27. EA I (Oct 15) is for Georgia residents; EA II (Nov 2) for everyone else.',
      prompts: [] },

    { id: 'ucsd', rank: 29, name: 'UC San Diego', full: 'University of California, San Diego', shared: 'uc' },

    { id: 'bc', rank: 31, name: 'Boston College', full: 'Boston College', app: 'Common App', url: 'https://www.bc.edu/bc-web/admission/apply.html',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-04'], ['RD', '2027-01-04']],
      groups: { g1: [1, 'Choose 1 of 4'] },
      colleges: [
        { id: 'std', name: 'Any program except Human-Centered Engineering', f: ['*'] },
        { id: 'hce', name: 'Human-Centered Engineering', f: ['eng'] }
      ],
      prompts: [
        ['A family or community tradition and what it means to you', 400, 'w', 'community', { c: 'std', g: 'g1' }],
        ['Someone you talk with about life’s big questions, and those conversations', 400, 'w', 'other', { c: 'std', g: 'g1' }],
        ['A time someone saw you through a single story, and how you moved past it', 400, 'w', 'challenge', { c: 'std', g: 'g1' }],
        ['Propose a fourth value to add to BC’s Jesuit ideals, and make the case', 400, 'w', 'other', { c: 'std', g: 'g1' }],
        ['Problems you care about and how Human-Centered Engineering would help you solve them', 400, 'w', 'major', { c: 'hce' }]
      ] },

    { id: 'nyu', rank: 31, name: 'NYU', full: 'New York University', app: 'Common App', url: 'https://www.nyu.edu/admissions/undergraduate-admissions/how-to-apply.html',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-01'], ['RD', '2027-01-05']],
      prompts: [
        ['How you have helped bring together people with different perspectives', 250, 'w', 'community', { opt: 1 }]
      ] },

    { id: 'tufts', rank: 31, name: 'Tufts', full: 'Tufts University', app: 'Common App', url: 'https://admissions.tufts.edu/apply/',
      plans: [['ED', '2026-11-02'], ['ED II', '2027-01-04'], ['RD', '2027-01-04']],
      colleges: [
        { id: 'eng', name: 'School of Engineering', f: ['eng', 'cs'] },
        { id: 'bfa', name: 'SMFA (BFA)', f: ['art'] },
        { id: 'combined', name: 'Combined BFA + BA/BS', f: [] },
        { id: 'as', name: 'School of Arts & Sciences', f: ['*'] }
      ],
      prompts: [
        ['How you discovered and got to know Tufts', 150, 'w', 'why'],
        ['An engineering project you built or designed, and your role in it', 200, 'w', 'activity', { c: 'eng' }],
        ['The ideas behind a piece in your portfolio and how they shaped your process', 200, 'w', 'other', { c: 'bfa' }],
        ['How your academics and your art feed each other', 200, 'w', 'other', { c: 'combined' }],
        ['A favorite assignment from the last two years, and why it appealed to you', 200, 'w', 'curiosity', { c: 'as' }]
      ] },

    { id: 'bu', rank: 34, name: 'Boston University', full: 'Boston University', app: 'Common App', url: 'https://www.bu.edu/admissions/apply/',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-05']],
      prompts: [
        ['What excites you about BU and what you would contribute to campus', 300, 'w', 'why']
      ] },

    { id: 'ucd', rank: 34, name: 'UC Davis', full: 'University of California, Davis', shared: 'uc' },
    { id: 'uci', rank: 34, name: 'UC Irvine', full: 'University of California, Irvine', shared: 'uc' },

    { id: 'uf', rank: 34, name: 'Florida', full: 'University of Florida', app: 'Common App', url: 'https://admissions.ufl.edu/apply/',
      plans: [['ED', '2026-10-15'], ['EA', '2026-11-01'], ['RD', '2027-01-15']],
      prompts: [
        ['Your most meaningful commitment outside the classroom, and why it matters', 250, 'w', 'activity'],
        ['Only if applying to the Honors Program: how you would contribute to it', 400, 'w', 'why', { opt: 1 }]
      ] },

    { id: 'uiuc', rank: 34, name: 'Illinois', full: 'University of Illinois Urbana-Champaign', app: 'Common App', url: 'https://admissions.illinois.edu/apply',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-05']],
      colleges: [
        { id: 'declared', name: 'Applying to a specific major', f: ['*'] },
        { id: 'und', name: 'Undeclared (Division of Exploratory Studies)', f: ['und'] }
      ],
      prompts: [
        ['A recent experience that shows your interest in your first-choice major', 150, 'w', 'major', { c: 'declared' }],
        ['Your goals and how your first-choice major helps you reach them', 150, 'w', 'major', { c: 'declared' }],
        ['Only if you list a second-choice major: why that major', 150, 'w', 'major', { c: 'declared', opt: 1 }],
        ['Your academic interests and two or three majors you are considering', 150, 'w', 'major', { c: 'und' }],
        ['Your future academic or career goals', 150, 'w', 'other', { c: 'und' }],
        ['Challenges that affected your academic record', 300, 'w', 'challenge', { opt: 1 }]
      ] },

    { id: 'utaustin', rank: 34, name: 'UT Austin', full: 'University of Texas at Austin', app: 'Common App or ApplyTexas', url: 'https://admissions.utexas.edu/apply/',
      plans: [['EA', '2026-10-15'], ['RD', '2026-12-01']],
      note: 'Architecture, nursing, art history, civic leadership and honors programs ask for extra writing.',
      prompts: [
        ['Why your first-choice major', 300, 'w', 'major'],
        ['The activity you are proudest of, and why', 300, 'w', 'activity'],
        ['Circumstances that affected your academic performance', 300, 'w', 'challenge', { opt: 1 }]
      ] },

    { id: 'wisc', rank: 34, name: 'Wisconsin', full: 'University of Wisconsin–Madison', app: 'Common App', url: 'https://admissions.wisc.edu/apply/',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-15']],
      prompts: [
        ['Why UW–Madison and your intended major (or your academic interests if undecided)', 650, 'w', 'why']
      ] },

    { id: 'wfu', rank: 34, name: 'Wake Forest', full: 'Wake Forest University', app: 'Common App', url: 'https://admissions.wfu.edu/apply/',
      plans: [['ED', '2026-11-15'], ['ED II', '2027-01-01'], ['RD', '2027-01-01']],
      groups: { o1: [4, 'Optional: answer any'] },
      prompts: [
        ['Why Wake Forest', 100, 'w', 'why'],
        ['Five books that intrigued you, with a short note on each', 750, 'c', 'curiosity', { g: 'o1', opt: 1 }],
        ['What sparks your intellectual curiosity', 150, 'w', 'curiosity', { g: 'o1', opt: 1 }],
        ['A Maya Angelou quote that speaks to you, and why', 300, 'w', 'other', { g: 'o1', opt: 1 }],
        ['A top-ten list on a theme of your choice', 1000, 'c', 'short', { g: 'o1', opt: 1 }]
      ] },

    { id: 'northeastern', rank: 42, name: 'Northeastern', full: 'Northeastern University', app: 'Common App', url: 'https://admissions.northeastern.edu/apply/',
      plans: [['EA', '2026-11-01'], ['ED', '2026-11-01'], ['ED II', '2027-01-01'], ['RD', '2027-01-01']],
      note: 'No supplemental essays. Only the Common App personal essay (plus an optional essay for the Honors Program).',
      prompts: [] },

    { id: 'villanova', rank: 42, name: 'Villanova', full: 'Villanova University', app: 'Common App', url: 'https://www1.villanova.edu/university/undergraduate-admission.html',
      plans: [['ED', '2026-11-01'], ['EA', '2026-11-01'], ['ED II', '2027-01-15'], ['RD', '2027-01-15']],
      groups: { g1: [1, 'Choose 1 of 5'] },
      prompts: [
        ['How you have worked to make your community fairer', 250, 'w', 'community', { g: 'g1' }],
        ['A life lesson you would share with your future classmates', 250, 'w', 'other', { g: 'g1' }],
        ['Why Villanova', 250, 'w', 'why', { g: 'g1' }],
        ['How technology and AI could serve your values and the common good', 250, 'w', 'other', { g: 'g1' }],
        ['A time you supported someone through something hard', 250, 'w', 'community', { g: 'g1' }]
      ] },

    { id: 'cwru', rank: 44, name: 'Case Western', full: 'Case Western Reserve University', app: 'Common App', url: 'https://case.edu/admission/apply',
      plans: [['ED', '2026-11-01'], ['EA', '2026-11-01'], ['ED II', '2027-01-15'], ['RD', '2027-01-15']],
      note: 'No supplemental essays for most applicants. Pre-Professional Scholars (PPSP) applicants write two.',
      colleges: [
        { id: 'std', name: 'Standard admission', f: ['*'] },
        { id: 'ppsp', name: 'Pre-Professional Scholars Program (PPSP)', f: [] }
      ],
      prompts: [
        ['PPSP: why this profession, why you fit it, and what drew you to it', 500, 'w', 'major', { c: 'ppsp' }],
        ['PPSP: something you are proud of that isn’t on your résumé', 750, 'w', 'other', { c: 'ppsp' }]
      ] },

    { id: 'lehigh', rank: 44, name: 'Lehigh', full: 'Lehigh University', app: 'Common App', url: 'https://www2.lehigh.edu/admissions/undergrad/apply',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-01'], ['RD', '2027-01-01']],
      prompts: [
        ['How you first heard about Lehigh and what made you apply', 200, 'w', 'why'],
        ['Something great happening in your life right now', 200, 'w', 'other'],
        ['How Lehigh’s college, program or major would help you reach your goals', 200, 'w', 'major']
      ] },

    { id: 'osu', rank: 44, name: 'Ohio State', full: 'The Ohio State University', app: 'Common App', url: 'https://undergrad.osu.edu/apply',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-15']],
      note: 'No supplemental essays for general admission. The Morrill Scholarship has its own optional essay.',
      prompts: [] },

    { id: 'rutgers', rank: 44, name: 'Rutgers', full: 'Rutgers University–New Brunswick', app: 'Rutgers application or Common App', url: 'https://admissions.rutgers.edu/apply',
      plans: [['EA', '2026-11-01'], ['RD', '2026-12-01']],
      note: 'No supplemental essays. Just the personal essay, plus optional space for circumstances that affected your grades.',
      prompts: [] },

    { id: 'ucsb', rank: 44, name: 'UC Santa Barbara', full: 'University of California, Santa Barbara', shared: 'uc' },

    { id: 'umd', rank: 49, name: 'Maryland', full: 'University of Maryland, College Park', app: 'Common App', url: 'https://admissions.umd.edu/apply',
      plans: [['EA', '2026-11-01'], ['RD', '2027-01-20']],
      prompts: [
        ['Somewhere you would like to travel, and why', 650, 'c', 'short'],
        ['An interesting thing you learned while researching something', 650, 'c', 'curiosity'],
        ['Academic subjects you enjoy beyond your intended major', 650, 'c', 'curiosity'],
        ['Something meaningful from an ordinary day, like last Monday', 650, 'c', 'short'],
        ['Something about you not shown elsewhere in your application', 650, 'c', 'short'],
        ['How diversity has helped you learn and grow', 650, 'c', 'community']
      ] },

    { id: 'rochester', rank: 49, name: 'Rochester', full: 'University of Rochester', app: 'Common App', url: 'https://admissions.rochester.edu/apply/',
      plans: [['ED', '2026-11-01'], ['ED II', '2027-01-05'], ['RD', '2027-01-05']],
      prompts: [
        ['How you would use Rochester’s flexible curriculum and opportunities to pursue your interests', 250, 'w', 'why']
      ] },

    { id: 'uw', rank: 49, name: 'Washington', full: 'University of Washington', app: 'Common App', url: 'https://admit.washington.edu/apply/first-year/',
      plans: [['RD', '2026-11-15']],
      note: 'No supplemental essays beyond the personal essay and the Common App’s optional sections.',
      prompts: [] }
  ],

  /* University of California: one application and four Personal Insight Questions for every campus */
  uc: {
    name: 'University of California', app: 'UC application', url: 'https://admission.universityofcalifornia.edu/how-to-apply/applying-as-a-freshman/personal-insight-questions.html',
    plans: [['RD', '2026-11-30']],
    note: 'One UC application covers every campus. Answer 4 of the 8 Personal Insight Questions; they go to each campus you pick.',
    groups: { g1: [4, 'Choose 4 of 8'] },
    prompts: [
      ['A time you led, influenced others or helped resolve a conflict', 350, 'w', 'activity', { g: 'g1' }],
      ['How you express your creative side', 350, 'w', 'other', { g: 'g1' }],
      ['Your greatest talent or skill and how you have developed it', 350, 'w', 'other', { g: 'g1' }],
      ['A significant educational opportunity you used, or a barrier you overcame', 350, 'w', 'challenge', { g: 'g1' }],
      ['A significant challenge, what you did about it, and how it affected your academics', 350, 'w', 'challenge', { g: 'g1' }],
      ['An academic subject that inspires you and how you pursued it', 350, 'w', 'major', { g: 'g1' }],
      ['Something you did to make your school or community a better place', 350, 'w', 'community', { g: 'g1' }],
      ['What else makes you a strong candidate for the University of California', 350, 'w', 'other', { g: 'g1' }]
    ]
  }
};
