import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
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
      // Fallback to default interests
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Your Profile</h2>
        <p className="text-muted-foreground">
          Tell us about yourself to match with people
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nickname</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="Choose a nickname"
            disabled={isLoading}
            data-testid="input-nickname"
            maxLength={20}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              data-testid="select-gender"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Age</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              disabled={isLoading}
              data-testid="input-age"
              min={13}
              max={120}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">What are your interests?</h3>
        <p className="text-muted-foreground text-sm mb-3">
          Select up to 5 interests to match with people who share them
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {interestsList.map((interest) => (
          <button
            key={interest}
            onClick={() => handleToggle(interest)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              selected.includes(interest)
                ? "bg-primary text-primary-foreground"
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
        <div className="flex flex-wrap gap-2">
          {selected.map((interest) => (
            <Badge key={interest} variant="default" className="flex items-center gap-2">
              {interest}
              <button
                onClick={() => setSelected(selected.filter(i => i !== interest))}
                className="ml-1 hover:opacity-70"
                data-testid={`button-remove-interest-${interest}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Button
        size="lg"
        onClick={handleContinue}
        disabled={selected.length === 0 || !nickname.trim() || !gender || !age || isLoading}
        className="w-full"
        data-testid="button-profile-continue"
      >
        {isLoading ? "Starting..." : "Start Chatting"}
      </Button>

      {(!nickname.trim() || !gender || !age || selected.length === 0) && (
        <p className="text-sm text-muted-foreground text-center">
          Complete all fields to continue
        </p>
      )}
    </div>
  );
}
