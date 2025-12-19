export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-4 flex justify-between items-center shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 className="font-bold text-xl tracking-tight">Whisper Voice-to-Text</h1>
      </div>
      <div className="flex gap-2 bg-blue-600 p-1 rounded-lg">
        <button
          className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-300 ${activeTab === "upload" ? "bg-white text-blue-700 shadow-md" : "text-white hover:bg-blue-500"}`}
          onClick={() => setActiveTab("upload")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload
        </button>
        <button
          className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-300 ${activeTab === "files" ? "bg-white text-blue-700 shadow-md" : "text-white hover:bg-blue-500"}`}
          onClick={() => setActiveTab("files")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Files
        </button>
      </div>
    </nav>
  );
}