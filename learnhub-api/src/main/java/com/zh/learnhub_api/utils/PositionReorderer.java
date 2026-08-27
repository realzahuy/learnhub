package com.zh.learnhub_api.utils;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.ObjIntConsumer;
import java.util.function.ToIntFunction;
import java.util.function.UnaryOperator;

@Component
public class PositionReorderer {

    public <T> List<T> reorder(
            List<T> rows,
            ToIntFunction<T> readPosition,
            ObjIntConsumer<T> writePosition,
            UnaryOperator<List<T>> saveAndFlush,
            Runnable assignFinal) {
        if (rows.isEmpty()) {
            return rows;
        }

        int temp = rows.stream().mapToInt(readPosition).max().orElse(0);
        for (T row : rows) {
            writePosition.accept(row, ++temp);
        }
        saveAndFlush.apply(rows);

        assignFinal.run();
        return saveAndFlush.apply(rows);
    }
}
