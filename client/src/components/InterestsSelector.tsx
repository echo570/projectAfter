import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, User, Heart, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface InterestsSelectorProps {
  onSelect: (data: { nickname: string; gender: string; age: number; interests: string[] }) => void;
  isLoading?: boolean;
}

export function InterestsSelector({ onSelect, isLoading = false }: InterestsSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [interestsList, setInterestsList] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      const response = await apiRequest("GET", "/api/interests");
      const data = await response.json();
      setInterestsList(data.interests || []);
    } catch (error) {
      console.error("Failed to load interests", error);
      setInterestsList([
        'Gaming', 'Music', 'Movies', 'Sports', 'Travel', 'Tech', 'Art', 'Books',
        'Fitness', 'Food', 'Photography', 'Cooking', 'Fashion', 'DIY', 'Pets',
        'Crypto', 'Business', 'Science', 'History', 'Comedy',
      ]);
    } finally {
      setListLoading(false);
    }
  };

  const handleToggle = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter(i => i !== interest));
    } else if (selected.length < 5) {
      setSelected([...selected, interest]);
    }
  };

  const handleContinue = () => {
    if (selected.length > 0 && nickname.trim() && gender && age) {
      onSelect({
        nickname: nickname.trim(),
        gender,
        age: parseInt(age),
        interests: selected,
      });
    }
  };

  const isComplete = selected.length > 0 && nickname.trim() && gender && age;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold">Create Your Profile</h2>
          <p className="text-muted-foreground mt-2">
            Let people know who you are
          </p>
        </div>
      </div>

      {/* Profile Info Card */}
      <Card className="p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary" />
            <label className="text-sm font-semibold">Nickname</label>
            <span className="text-xs text-muted-foreground ml-auto">{nickname.length}/20</span>
          </div>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="Choose a nickname..."
            disabled={isLoading}
            data-testid="input-nickname"
            maxLength={20}
            className="text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background hover-elevate transition-all"
              data-testid="select-gender"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">Age</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
              disabled={isLoading}
              data-testid="input-age"
              min={13}
              max={120}
              className="text-base"
            />
          </div>
        </div>
      </Card>

      {/* Interests Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">What are your interests?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pick up to 5 to help us find your people
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {interestsList.map((interest) => (
            <button
              key={interest}
              onClick={() => handleToggle(interest)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selected.includes(interest)
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-secondary text-secondary-foreground hover-elevate"
              }`}
              disabled={isLoading || (selected.length >= 5 && !selected.includes(interest))}
              data-testid={`button-interest-${interest}`}
            >
              {interest}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex flex-wrap gap-2">
              {selected.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5"
                >
                  <span>{interest}</span>
                  <button
                    onClick={() => setSelected(selected.filter(i => i !== interest))}
                    className="hover:opacity-70 transition-opacity"
                    data-testid={`button-remove-interest-${interest}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Profile completion</span>
          <span className="font-semibold">{[nickname, gender, age, selected.length > 0].filter(Boolean).length}/4</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{
              width: `${([nickname, gender, age, selected.length > 0].filter(Boolean).length / 4) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Action Button */}
      <Button
        size="lg"
        onClick={handleContinue}
        disabled={!isComplete || isLoading}
        className="w-full h-12 text-base font-semibold"
        data-testid="button-profile-continue"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Starting...
          </span>
        ) : (
          "Start Chatting"
        )}
      </Button>

      {!isComplete && (
        <p className="text-xs text-muted-foreground text-center">
          Complete all fields to get started
        </p>
      )}
    </div>
  );
}
