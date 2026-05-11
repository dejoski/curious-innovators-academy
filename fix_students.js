const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/students/page.tsx', 'utf8');

// 1. Add state variables
content = content.replace(
  'const [selectedStudents, setSelectedStudents] = useState<number[]>([]);',
  `const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCoreFilterOpen, setIsCoreFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  const itemsPerPage = 5;
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const coreFilterRef = React.useRef<HTMLDivElement>(null);
  const statusFilterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (coreFilterRef.current && !coreFilterRef.current.contains(event.target as Node)) {
        setIsCoreFilterOpen(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setIsStatusFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);`
);

// 2. Pagination logic
content = content.replace(
  'const handleSelectStudent = (id: number) => {',
  `const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveDropdown(null);
    }
  };

  const handleSelectStudent = (id: number) => {`
);

// 3. Update TableRow to use activeDropdown and handle click
content = content.replace(
  'onSelect: (id: number) => void;\n}) {',
  `onSelect: (id: number) => void;
  activeDropdown: number | null;
  setActiveDropdown: (id: number | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}) {`
);

content = content.replace(
  '<button \n          onClick={() => alert(`Showing options for ${studentName}`)}\n          className="cursor-pointer relative size-[24px] hover:opacity-70 transition-opacity rounded-full hover:bg-gray-200 p-1"\n        >\n          <img alt="" className="block size-full" src={imgWeuiMoreOutlined} />\n        </button>',
  `<div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown(activeDropdown === studentId ? null : studentId);
            }}
            className={\`cursor-pointer relative size-[24px] hover:opacity-70 transition-opacity rounded-full p-1 \${activeDropdown === studentId ? 'bg-gray-200' : 'hover:bg-gray-200'}\`}
          >
            <img alt="" className="block size-full" src={imgWeuiMoreOutlined} />
          </button>
          
          {activeDropdown === studentId && (
            <div ref={dropdownRef} className="absolute right-8 top-8 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30">
              <button onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Edit Student</button>
              <button onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">View Schedule</button>
              <button onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Message Parent</button>
              <div className="border-t border-gray-100 my-1"></div>
              <button onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Remove Student</button>
            </div>
          )}
        </div>`
);

// 4. Update TableRow usage
content = content.replace(
  'onSelect={handleSelectStudent}\n                  />',
  `onSelect={handleSelectStudent}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    dropdownRef={dropdownRef}
                  />`
);

// 5. Update paginatedStudents in map
content = content.replace(
  'filteredStudents.map((student) => (',
  'paginatedStudents.map((student) => ('
);

// 6. Update Pagination UI
content = content.replace(
  /<div className="flex justify-between items-center mt-4 border-t border-\[#f0f0f0\] pt-4">[\s\S]*?<\/div>\n        <\/div>/,
  `<div className="flex justify-between items-center mt-4 border-t border-[#f0f0f0] pt-4">
          <div className="flex gap-[12px] items-center mx-auto">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={\`flex items-center justify-center size-[24px] rotate-90 rounded-full transition-colors \${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 hover:opacity-70'}\`}
            >
              <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown2} />
            </button>
            <div className="flex gap-[3px] items-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button 
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={\`transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[24px] \${currentPage === page ? 'bg-[#14c1d5] hover:bg-[#12aebd]' : 'hover:bg-gray-100'}\`}
                >
                  <p className={\`font-['Inter:Semi_Bold',sans-serif] font-semibold text-[12px] text-center leading-[0] \${currentPage === page ? 'text-white' : 'text-[#666d80]'}\`}>
                    {page}
                  </p>
                </button>
              ))}
            </div>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={\`flex items-center justify-center size-[24px] -rotate-90 rounded-full transition-colors \${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 hover:opacity-70'}\`}
            >
              <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown3} />
            </button>
          </div>
        </div>`
);

// 7. Update Filter Dropdowns and Create Button
content = content.replace(
  /<button \n              onClick=\{\(\) => alert\("Filter options coming soon!"\)\}\n              className="bg-\[#fafafa\] flex gap-\[4px\] items-center p-\[8px\] rounded-\[8px\] shrink-0 cursor-pointer hover:bg-gray-100 transition-colors"\n            >[\s\S]*?<\/button>\n            \n            <button \n              onClick=\{\(\) => alert\("Filter options coming soon!"\)\}\n              className="bg-\[#fafafa\] flex gap-\[4px\] items-center p-\[8px\] rounded-\[8px\] shrink-0 cursor-pointer hover:bg-gray-100 transition-colors"\n            >[\s\S]*?<\/button>/,
  `{/* Core Filter */}
            <div className="relative" ref={coreFilterRef}>
              <button 
                onClick={() => setIsCoreFilterOpen(!isCoreFilterOpen)}
                className={\`bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer transition-colors \${isCoreFilterOpen ? 'ring-2 ring-[#14c1d5] bg-gray-50' : 'hover:bg-gray-100'}\`}
              >
                <div className="flex items-center justify-center w-[14px] h-[14px] relative">
                  <img alt="" className="w-full h-full object-contain" src={imgVector} />
                </div>
                <p className="font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12]">Core</p>
                <div className="relative shrink-0 size-[14px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconCaretDown} />
                </div>
              </button>
              {isCoreFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button onClick={() => setIsCoreFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">All Classes</button>
                  <button onClick={() => setIsCoreFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-[#14c1d5] bg-blue-50 font-medium hover:bg-blue-100 transition-colors">Core Classes</button>
                  <button onClick={() => setIsCoreFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Enrichment Classes</button>
                </div>
              )}
            </div>
            
            {/* Status Filter */}
            <div className="relative" ref={statusFilterRef}>
              <button 
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className={\`bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer transition-colors \${isStatusFilterOpen ? 'ring-2 ring-[#14c1d5] bg-gray-50' : 'hover:bg-gray-100'}\`}
              >
                <div className="flex items-center justify-center w-[14px] h-[14px] relative">
                  <img alt="" className="w-full h-full object-contain" src={imgVector} />
                </div>
                <p className="font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12]">Schedule Status: All</p>
                <div className="relative shrink-0 size-[14px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconCaretDown} />
                </div>
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button onClick={() => setIsStatusFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-[#14c1d5] bg-blue-50 font-medium hover:bg-blue-100 transition-colors">All Statuses</button>
                  <button onClick={() => setIsStatusFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Completed</button>
                  <button onClick={() => setIsStatusFilterOpen(false)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Incomplete</button>
                </div>
              )}
            </div>`
);

content = content.replace(
  'onClick={() => alert("Create Student modal coming soon!")}',
  'onClick={() => setIsCreateModalOpen(true)}'
);

// 8. Add Modal UI at the end
content = content.replace(
  '    </div>\n  );\n}',
  `      {/* Interactive Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h2 className="font-['Inter:Bold',sans-serif] font-bold text-xl text-[#0d0d12]">Create New Student</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-['Inter:Semi_Bold',sans-serif] text-sm text-gray-700">Student Name</label>
                <input type="text" placeholder="e.g. Alex Johnson" className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-['Inter:Semi_Bold',sans-serif] text-sm text-gray-700">Parent Name</label>
                <input type="text" placeholder="e.g. Mr. Johnson" className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-['Inter:Semi_Bold',sans-serif] text-sm text-gray-700">Grade Level</label>
                <select className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] transition-all bg-white">
                  <option>Grade 1</option>
                  <option>Grade 2</option>
                  <option>Grade 3</option>
                  <option>Grade 4</option>
                  <option>Grade 5</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-lg font-['Inter:Medium',sans-serif] text-sm text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={() => { alert("Student Created!"); setIsCreateModalOpen(false); }} className="px-4 py-2 rounded-lg font-['Inter:Medium',sans-serif] text-sm bg-[#14c1d5] text-white hover:bg-[#12aebd] transition-colors shadow-sm">Save Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
);

fs.writeFileSync('src/app/dashboard/students/page.tsx', content);
