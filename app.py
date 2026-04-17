from flask import Flask, render_template, request

app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def home():
    result = None
    error = None

    if request.method == "POST":
        try:
            name = request.form["name"].strip()
            gender = request.form["gender"]
            age = int(request.form["age"])
            height = float(request.form["height"])
            weight = float(request.form["weight"])
            goal = request.form["goal"]
            walking_speed = request.form["walking_speed"]
            walking_minutes = int(request.form["walking_minutes"])

            if gender == "male":
                base_calories = (10 * weight) + (6.25 * height) - (5 * age) + 5
            elif gender == "female":
                base_calories = (10 * weight) + (6.25 * height) - (5 * age) - 161
            else:
                error = "يرجى اختيار الجنس بشكل صحيح."
                return render_template("index.html", result=result, error=error)

            if walking_speed == "slow":
                walk_burn = 0.035 * weight * walking_minutes
                speed_text = "بطيء"
            elif walking_speed == "medium":
                walk_burn = 0.05 * weight * walking_minutes
                speed_text = "متوسط"
            elif walking_speed == "fast":
                walk_burn = 0.065 * weight * walking_minutes
                speed_text = "سريع"
            else:
                error = "يرجى اختيار سرعة المشي بشكل صحيح."
                return render_template("index.html", result=result, error=error)

            total_calories = base_calories + walk_burn

            if goal == "lose":
                total_calories -= 500
                goal_text = "خسارة وزن"
            elif goal == "gain":
                total_calories += 500
                goal_text = "زيادة وزن"
            elif goal == "maintain":
                goal_text = "ثبات الوزن"
            else:
                error = "يرجى اختيار الهدف بشكل صحيح."
                return render_template("index.html", result=result, error=error)

            if total_calories < 0:
                total_calories = 0

            result = {
                "name": name,
                "gender": "ذكر" if gender == "male" else "أنثى",
                "age": age,
                "height": height,
                "weight": weight,
                "goal": goal_text,
                "walking_speed": speed_text,
                "walking_minutes": walking_minutes,
                "base_calories": int(base_calories),
                "walk_burn": int(walk_burn),
                "final_calories": int(total_calories)
            }

        except ValueError:
            error = "يرجى إدخال أرقام صحيحة في العمر والطول والوزن ودقائق المشي."

    return render_template("index.html", result=result, error=error)


if __name__ == "__main__":
    app.run(debug=True)