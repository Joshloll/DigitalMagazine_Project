import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, increment, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Eye, Heart, MessageSquare, PlusCircle, Send, Trash2, User, Wrench } from 'lucide-react';

// --- MOCK FIREBASE CONFIG (for development if globals aren't available) ---
// In a real environment, __app_id and __firebase_config would be provided.
const mockFirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- HELPER HOOK for screen size detection ---
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);
  return matches;
};


// --- UI COMPONENTS ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, className = '', variant = 'primary', ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
);


// --- MAIN APPLICATION COMPONENTS ---

const MagazineCreator = ({ db, appId, onMagazineCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Title and Content are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const magazinesCollectionPath = `/artifacts/${appId}/public/data/magazines`;
      await addDoc(collection(db, magazinesCollectionPath), {
        title,
        description,
        coverImageUrl: coverImageUrl || `https://placehold.co/600x800/6366f1/ffffff?text=${encodeURIComponent(title)}`,
        content,
        views: 0,
        likes: [],
        createdAt: Timestamp.now(),
      });
      setTitle('');
      setDescription('');
      setCoverImageUrl('');
      setContent('');
      onMagazineCreated();
    } catch (error) {
      console.error("Error creating magazine:", error);
      alert("Failed to create magazine. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Create New Magazine</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Magazine Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
        <input type="url" placeholder="Cover Image URL (optional)" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <textarea placeholder="Short Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows="3"></textarea>
        <textarea placeholder="Magazine Content (Markdown supported)" value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows="10" required></textarea>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Publishing...' : 'Publish Magazine'}
        </Button>
      </form>
    </Card>
  );
};

const FeedbackViewer = ({ db, appId }) => {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !appId) return;
        const feedbackCollectionPath = `/artifacts/${appId}/public/data/feedback`;
        const q = query(collection(db, feedbackCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feedbackData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in memory
            feedbackData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setFeedback(feedbackData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feedback:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    if (loading) return <Spinner />;

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Reader Feedback</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {feedback.length > 0 ? (
                    feedback.map(item => (
                        <div key={item.id} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <p className="text-gray-800 dark:text-gray-200">{item.suggestion}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">By: {item.userId.substring(0, 8)}... on {item.createdAt.toDate().toLocaleString()}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">No feedback submitted yet.</p>
                )}
            </div>
        </Card>
    );
};


const AdminDashboard = ({ db, appId, magazines, onMagazineDeleted }) => {
    const [showCreator, setShowCreator] = useState(false);

    const handleDelete = async (magazineId) => {
        if (window.confirm("Are you sure you want to delete this magazine? This action cannot be undone.")) {
            try {
                const magazineDocPath = `/artifacts/${appId}/public/data/magazines/${magazineId}`;
                await deleteDoc(doc(db, magazineDocPath));
                onMagazineDeleted();
            } catch (error) {
                console.error("Error deleting magazine:", error);
                alert("Failed to delete magazine. Check console for details.");
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                <Button onClick={() => setShowCreator(!showCreator)}>
                    <PlusCircle size={20} /> {showCreator ? 'Close Creator' : 'New Magazine'}
                </Button>
            </div>

            {showCreator && <MagazineCreator db={db} appId={appId} onMagazineCreated={() => setShowCreator(false)} />}
            
            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Manage Magazines</h2>
                <div className="space-y-4">
                    {magazines.map(magazine => (
                        <div key={magazine.id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white">{magazine.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Published on {magazine.createdAt.toDate().toLocaleDateString()}</p>
                            </div>
                            <Button onClick={() => handleDelete(magazine.id)} variant="danger">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>

            <FeedbackViewer db={db} appId={appId} />
        </div>
    );
};

const MagazineReader = ({ magazine, db, appId, userId, onBack }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    // Effect to increment view count
    useEffect(() => {
        if (!db || !appId || !magazine.id) return;
        const updateViewCount = async () => {
            const magazineDocPath = `/artifacts/${appId}/public/data/magazines/${magazine.id}`;
            try {
                await updateDoc(doc(db, magazineDocPath), {
                    views: increment(1)
                });
            } catch (error) {
                console.error("Error updating view count:", error);
            }
        };
        updateViewCount();
    }, [db, appId, magazine.id]);

    // Effect for comments
    useEffect(() => {
        if (!db || !appId || !magazine.id) return;
        const commentsCollectionPath = `/artifacts/${appId}/public/data/magazines/${magazine.id}/comments`;
        const q = query(collection(db, commentsCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commentsData.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
            setComments(commentsData);
        });
        return () => unsubscribe();
    }, [db, appId, magazine.id]);
    
    // Effect to check like status and count
    useEffect(() => {
        setIsLiked(magazine.likes?.includes(userId));
        setLikeCount(magazine.likes?.length || 0);
    }, [magazine.likes, userId]);


    const handleLike = async () => {
        const magazineDocPath = `/artifacts/${appId}/public/data/magazines/${magazine.id}`;
        try {
            await updateDoc(doc(db, magazineDocPath)