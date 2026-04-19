import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';
import { CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, increment, arrayUnion, doc, updateDoc } from 'firebase/firestore';

export default function Tasks() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<{ id: string; timeLeft: number } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      // Filter tasks that are not completed yet
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const uncompletedTasks = allTasks.filter(task => !user?.completed_tasks?.includes(task.id));
      setTasks(uncompletedTasks);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });
    return () => unsubscribe();
  }, [user?.completed_tasks]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTask && activeTask.timeLeft > 0) {
      interval = setInterval(() => {
        setActiveTask(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTask]);

  const startTask = (task: any) => {
    if (task.link) {
      window.open(task.link, '_blank');
    }
    setActiveTask({ id: task.id, timeLeft: task.timer || 30 });
    toast.info(`Task started! Please wait ${task.timer || 30} seconds before claiming.`);
  };

  const handleCompleteTask = async (task: any) => {
    if (!user) return;
    
    // Safety check: already completed?
    if (user.completed_tasks?.includes(task.id)) {
      toast.error('You have already completed this task!');
      return;
    }

    setCompleting(task.id);
    try {
      const now = new Date().toISOString();
      
      // Add to history
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        type: 'task',
        points: task.points_reward,
        description: `Completed Task: ${task.title}`,
        created_at: serverTimestamp()
      });

      // Update user points and completed tasks list
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(task.points_reward),
        last_task_at: now,
        completed_tasks: arrayUnion(task.id)
      });

      toast.success(`Task completed! You earned ${task.points_reward} points.`);
      setActiveTask(null);
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error('Failed to complete task');
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Daily Tasks</h1>
        <p className="text-slate-500">Complete simple tasks to earn extra points every day.</p>
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="my-4 min-h-[90px]" />
      <AdUnit code={settings.ad_banner_468x60} className="my-4 min-h-[60px]" />

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="p-6 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={task.type === 'daily' ? 'default' : 'secondary'}>
                    {task.type === 'daily' ? 'Daily' : 'One-time'}
                  </Badge>
                  <CardTitle className="text-xl">{task.title}</CardTitle>
                </div>
                <CardDescription>{task.description}</CardDescription>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <CheckCircle2 size={16} />
                    <span>{task.points_reward} Points</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-sm">
                    <Clock size={16} />
                    <span>{task.timer || 30}s</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex items-center justify-center sm:border-l">
                {activeTask?.id === task.id ? (
                  <Button 
                    onClick={() => handleCompleteTask(task)}
                    disabled={activeTask.timeLeft > 0 || !!completing}
                    className={`w-full sm:w-auto ${activeTask.timeLeft === 0 ? 'bg-emerald-600 hover:bg-emerald-700 animate-bounce' : ''}`}
                  >
                    {completing === task.id ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    {activeTask.timeLeft > 0 ? `Wait ${activeTask.timeLeft}s` : 'Claim Reward'}
                    {activeTask.timeLeft === 0 && <CheckCircle2 size={16} className="ml-2" />}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => startTask(task)}
                    disabled={!!completing || (!!activeTask && activeTask.id !== task.id)}
                    className="w-full sm:w-auto"
                  >
                    Start Task
                    <ExternalLink size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
          <p className="text-slate-400">No tasks available at the moment. Check back later!</p>
        </div>
      )}
    </div>
  );
}
