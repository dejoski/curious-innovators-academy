const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/students/page.tsx', 'utf8');

// remove modal from TableRow (lines 111-145)
const lines = content.split('\n');
lines.splice(110, 35);
content = lines.join('\n');

// add modal to the end of StudentsStudentsList
const lastIndex = content.lastIndexOf('    </div>\n  );\n}');
content = content.substring(0, lastIndex) + `      {/* Interactive Modal */}
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

fs.writeFileSync('src/app/dashboard/students/page.tsx', content);
